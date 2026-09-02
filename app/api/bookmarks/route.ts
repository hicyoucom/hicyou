import { logger } from "@/lib/logger";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { bookmarkCategories, bookmarks } from "@/db/schema";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { and, asc, count, desc, eq, exists, gt, ilike, inArray, lt, notExists, or, type SQL } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { z } from "zod";
import {
  normalizeCategorySelection,
  replaceBookmarkCategories,
} from "@/lib/category-assignments";
import { getCategoryAssignmentsForBookmarkIds } from "@/lib/data";
import { MAX_BOOKMARK_TITLE_LENGTH } from "@/lib/bookmark-limits";
import { generateSlug } from "@/lib/utils";
import { normalizeHttpUrl, UrlValidationError } from "@/lib/url-validator";

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional();
const keyFeatureSchema = z.union([
  z.string().trim().min(1).max(300),
  z
    .object({
      name: z.string().trim().min(1).max(160),
      description: z.string().trim().max(1_000).optional(),
    })
    .strict(),
]);
const bookmarkCreateSchema = z
  .object({
    url: z.string().trim().min(1).max(2_048),
    title: z.string().trim().min(1).max(MAX_BOOKMARK_TITLE_LENGTH),
    slug: z
      .string()
      .trim()
      .max(200)
      .regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    description: optionalText(1_000),
    categoryId: z.number().int().positive().nullable().optional(),
    categoryIds: z.array(z.number().int().positive()).max(3).optional(),
    overview: optionalText(6_000),
    favicon: optionalText(2_048),
    screenshot: optionalText(2_048),
    ogImage: optionalText(2_048),
    ogTitle: optionalText(500),
    ogDescription: optionalText(1_000),
    notes: optionalText(10_000),
    tags: optionalText(2_000),
    isArchived: z.boolean().optional(),
    isFavorite: z.boolean().optional(),
    isDofollow: z.boolean().optional(),
    search_results: optionalText(20_000),
    pricingType: z.string().trim().min(1).max(40).optional(),
    whyStartups: optionalText(3_000),
    alternatives: optionalText(2_000),
    keyFeatures: z.array(keyFeatureSchema).max(30).optional(),
    useCases: z.array(z.string().trim().min(1).max(500)).max(30).optional(),
    faqs: z
      .array(
        z
          .object({
            question: z.string().trim().min(1).max(500),
            answer: z.string().trim().min(1).max(3_000),
          })
          .strict(),
      )
      .max(30)
      .optional(),
  })
  .strict();

// archived tri-state: hide is the admin default (matches the new UI's hidden
// state), only/all are explicit overrides surfaced through the filter bar.
const ARCHIVED_VALUES = ["hide", "only", "all"] as const;
type ArchivedFilter = (typeof ARCHIVED_VALUES)[number];

// Sort options. `newest` is the original (id DESC) and stays the default
// for back-compat — old clients calling without `?sort=` get the same shape.
// Title sorts use a (title, id) composite under the hood so non-unique
// titles still page deterministically.
const SORT_VALUES = ["newest", "oldest", "title", "title_desc"] as const;
type SortOption = (typeof SORT_VALUES)[number];

// .strict() rejects unknown params so typos like `?cusor=10` surface as a
// 400 instead of silently returning the first page.
// `cursor` is a string: numeric for id-based sorts, base64url-JSON for title
// sorts. Validation of structure happens after we know which sort to apply.
// 4096 is comfortably above the maximum cursor this endpoint can emit
// given the write-side cap `MAX_BOOKMARK_TITLE_LENGTH = 500` (see
// lib/bookmark-limits.ts): a 500-char title encodes to ~700 base64url
// chars after JSON wrap, leaving ~5× headroom. The cap is intentionally
// loose so a future bump to the title bound doesn't silently start
// 400'ing legitimate load-more requests for rows we just returned.
const querySchema = z
  .object({
    cursor: z.string().min(1).max(4096).optional(),
    limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).optional(),
    q: z.string().trim().max(200).optional(),
    // Multi-select. Accepts numeric category ids; the sentinel "none" maps
    // to "category IS NULL" (uncategorised bookmarks).
    category: z.array(z.string().regex(/^(none|[1-9]\d*)$/)).optional(),
    archived: z.enum(ARCHIVED_VALUES).optional(),
    pricingType: z.string().trim().min(1).max(40).optional(),
    sort: z.enum(SORT_VALUES).optional(),
  })
  .strict();

// Derived from the schema shape so adding a new query param to
// `querySchema` automatically expands the allow-list — no parallel
// hand-maintained list to drift.
const KNOWN_KEYS = querySchema.shape;

// Single source of truth for the ILIKE list. Both the items query and the
// total-count query call this so any future column change applies everywhere.
function buildSearchClause(q: string | undefined): SQL | undefined {
  if (!q) return undefined;
  const like = `%${q}%`;
  return or(
    ilike(bookmarks.title, like),
    ilike(bookmarks.description, like),
    ilike(bookmarks.overview, like),
    ilike(bookmarks.notes, like),
  );
}

function buildCategoryClause(values: string[] | undefined): SQL | undefined {
  if (!values || values.length === 0) return undefined;
  // .filter(Number.isFinite) is defensive — today the zod regex blocks
  // non-numeric strings before we land here, but if that schema ever
  // loosens we'd otherwise silently feed `NaN` into the inArray.
  const ids = values
    .filter((v) => v !== "none")
    .map((v) => Number(v))
    .filter(Number.isFinite);
  const includeNull = values.includes("none");
  const clauses: SQL[] = [];
  if (ids.length > 0) {
    clauses.push(
      exists(
        db
          .select({ id: bookmarkCategories.bookmarkId })
          .from(bookmarkCategories)
          .where(
            and(
              eq(bookmarkCategories.bookmarkId, bookmarks.id),
              inArray(bookmarkCategories.categoryId, ids),
            ),
          ),
      ),
    );
  }
  if (includeNull) {
    clauses.push(
      notExists(
        db
          .select({ id: bookmarkCategories.bookmarkId })
          .from(bookmarkCategories)
          .where(eq(bookmarkCategories.bookmarkId, bookmarks.id)),
      ),
    );
  }
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return or(...clauses);
}

function buildArchivedClause(value: ArchivedFilter | undefined): SQL | undefined {
  // Default = hide archived. Explicit "all" disables the clause; "only"
  // flips it to show ONLY archived.
  const effective: ArchivedFilter = value ?? "hide";
  if (effective === "all") return undefined;
  return eq(bookmarks.isArchived, effective === "only");
}

function buildPricingClause(value: string | undefined): SQL | undefined {
  if (!value) return undefined;
  // Case-insensitive so external admin tooling (curl, dashboards) that
  // sends `?pricingType=free` still matches the canonical "Free" stored
  // value. UI dropdown sends exact-case so this is purely defensive.
  return ilike(bookmarks.pricingType, value);
}

// ── Cursor codec ──────────────────────────────────────────────────────────
// Two cursor shapes:
//   • id-based (newest / oldest): raw numeric string, kept for back-compat
//     with the first-generation /api/bookmarks pagination clients.
//   • composite (title / title_desc): base64url-encoded
//     `{"t":"<title>","i":<id>}` so non-unique titles still page in a
//     deterministic order via the (title, id) tuple.
// Discriminated union: id-based sorts produce an IdCursor (title absent by
// design); title sorts produce a TitleCursor (title required). Callers
// switch on `sort` first, so the narrowing is exhaustive.
type ParsedCursor =
  | { kind: "id"; id: number }
  | { kind: "title"; id: number; title: string };

// Strict numeric pattern: no scientific notation, no leading zeros, no
// whitespace. Matches the original integer-id contract from PR #7.
const NUMERIC_CURSOR_PATTERN = /^[1-9]\d*$/;

function decodeCursor(raw: string | undefined, sort: SortOption): ParsedCursor | null {
  if (!raw) return null;
  if (sort === "newest" || sort === "oldest") {
    if (!NUMERIC_CURSOR_PATTERN.test(raw)) return null;
    const id = parseInt(raw, 10);
    return Number.isSafeInteger(id) ? { kind: "id", id } : null;
  }
  // title / title_desc → base64url JSON
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { t?: unknown; i?: unknown };
    if (
      typeof parsed.t !== "string" ||
      typeof parsed.i !== "number" ||
      !Number.isSafeInteger(parsed.i) ||
      parsed.i <= 0
    ) {
      return null;
    }
    return { kind: "title", id: parsed.i, title: parsed.t };
  } catch {
    return null;
  }
}

function encodeCursor(row: { id: number; title: string }, sort: SortOption): string {
  if (sort === "newest" || sort === "oldest") return String(row.id);
  return Buffer.from(JSON.stringify({ t: row.title, i: row.id }), "utf8").toString("base64url");
}

function buildCursorClause(cursor: ParsedCursor | null, sort: SortOption): SQL | undefined {
  if (!cursor) return undefined;
  // Sort and cursor.kind are paired by `decodeCursor` — the union'd guard
  // below makes the invariant explicit. We throw (not silently return) on
  // mismatch because a silent fall-through would restart pagination at
  // page 1 mid-walk and duplicate rows on subsequent pages. A real bug
  // here should fail closed at the request boundary as a 500.
  const assertKind = (expected: ParsedCursor["kind"]): void => {
    if (cursor.kind !== expected) {
      throw new Error(
        `cursor kind/sort mismatch: cursor=${cursor.kind} but sort=${sort}`,
      );
    }
  };
  switch (sort) {
    case "newest":
      assertKind("id");
      return lt(bookmarks.id, cursor.id);
    case "oldest":
      assertKind("id");
      return gt(bookmarks.id, cursor.id);
    case "title":
      assertKind("title");
      // (title, id) > (lastTitle, lastId) — emulate row-tuple comparison
      // with two clauses ORed: title strictly greater, OR equal title and
      // id strictly greater (tiebreaker keeps the page boundary stable).
      // Narrowing via switch on `sort` doesn't reach into `cursor.kind`
      // for TS, so the cast after assertKind is needed.
      return or(
        gt(bookmarks.title, (cursor as { title: string }).title),
        and(eq(bookmarks.title, (cursor as { title: string }).title), gt(bookmarks.id, cursor.id)),
      );
    case "title_desc":
      assertKind("title");
      return or(
        lt(bookmarks.title, (cursor as { title: string }).title),
        and(eq(bookmarks.title, (cursor as { title: string }).title), lt(bookmarks.id, cursor.id)),
      );
  }
}

function buildOrderBy(sort: SortOption): SQL[] {
  // Always include id as a tiebreaker so equal sort keys never produce a
  // random page boundary.
  switch (sort) {
    case "newest":
      return [desc(bookmarks.id)];
    case "oldest":
      return [asc(bookmarks.id)];
    case "title":
      return [asc(bookmarks.title), asc(bookmarks.id)];
    case "title_desc":
      return [desc(bookmarks.title), desc(bookmarks.id)];
  }
}

// Field set the admin table actually renders. Excludes heavy JSON blobs
// (keyFeatures / useCases / faqs / search_results) so a 50-row page doesn't
// drag MBs of mostly-unused payload over the wire. CRUD endpoints
// (POST + /[identifier] GET) still hand back the full row when needed.
const LIST_COLUMNS = {
  id: bookmarks.id,
  url: bookmarks.url,
  slug: bookmarks.slug,
  title: bookmarks.title,
  description: bookmarks.description,
  categoryId: bookmarks.categoryId,
  overview: bookmarks.overview,
  notes: bookmarks.notes,
  favicon: bookmarks.favicon,
  ogImage: bookmarks.ogImage,
  isArchived: bookmarks.isArchived,
  isFavorite: bookmarks.isFavorite,
  isDofollow: bookmarks.isDofollow,
  createdAt: bookmarks.createdAt,
  updatedAt: bookmarks.updatedAt,
} as const;

// Admin-only paginated listing. Admin scrolls a "load more" button rather
// than jumping pages.
//
// Filters (all optional, AND'd together):
//   ?q=<≤200 chars>      case-insensitive ILIKE on title/description/overview/notes
//   ?category=<id>       repeat for multi-select; `none` matches uncategorised
//   ?archived=hide|only|all   default `hide` (admin rarely wants the archive)
//   ?pricingType=Free|Paid|…  case-insensitive match on the column value
//
// Sort:
//   ?sort=newest         (default) id descending — newest first
//   ?sort=oldest         id ascending
//   ?sort=title          title ascending, id as tiebreaker
//   ?sort=title_desc     title descending, id descending
//
// Cursor is opaque: numeric for id-based sorts (back-compat with the
// first-generation pagination clients), base64url-JSON `{t,i}` for title
// sorts so non-unique titles page deterministically via (title, id).
//
// Response shape: { items, nextCursor, total }
//   items       — at most `limit` rows (default 50, hard cap 200); admin
//                 list-projected (no JSON blobs)
//   nextCursor  — opaque cursor string, or null when exhausted
//   total       — overall count matching the active filters (only sent on
//                 the first page; null on cursor-paged requests to avoid
//                 a redundant sequential scan on every load-more)
//
// No CDN Cache-Control header: responses are per-admin and contain
// unpublished data.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  // Manual extraction (NOT Object.fromEntries(entries())) so multi-valued
  // `category` actually survives — entries() drops all but the last when a
  // key repeats. The unknown-key check uses the zod schema's own shape as
  // the source of truth so adding a field to querySchema doesn't require
  // a parallel allow-list update.
  const sp = request.nextUrl.searchParams;
  const allKeys = new Set(sp.keys());
  const unknown = [...allKeys].filter((k) => !(k in KNOWN_KEYS));
  if (unknown.length > 0) {
    return NextResponse.json(
      { error: "Invalid query", details: { unknown } },
      { status: 400 },
    );
  }
  const parsed = querySchema.safeParse({
    cursor: sp.get("cursor") ?? undefined,
    limit: sp.get("limit") ?? undefined,
    q: sp.get("q") ?? undefined,
    category: sp.getAll("category").length > 0 ? sp.getAll("category") : undefined,
    archived: sp.get("archived") ?? undefined,
    pricingType: sp.get("pricingType") ?? undefined,
    sort: sp.get("sort") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { cursor: cursorRaw, q, category, archived, pricingType } = parsed.data;
  const limit = parsed.data.limit ?? PAGE_SIZE_DEFAULT;
  const sort: SortOption = parsed.data.sort ?? "newest";
  const cursor = decodeCursor(cursorRaw, sort);
  if (cursorRaw !== undefined && cursor === null) {
    return NextResponse.json(
      { error: "Invalid query", details: { cursor: ["Malformed cursor for the requested sort"] } },
      { status: 400 },
    );
  }

  try {
    // Filter clauses shared between the items query and the count query so
    // total stays in sync with what the admin actually sees.
    const sharedFilters: SQL[] = [];
    const searchClause = buildSearchClause(q);
    if (searchClause) sharedFilters.push(searchClause);
    const categoryClause = buildCategoryClause(category);
    if (categoryClause) sharedFilters.push(categoryClause);
    const archivedClause = buildArchivedClause(archived);
    if (archivedClause) sharedFilters.push(archivedClause);
    const pricingClause = buildPricingClause(pricingType);
    if (pricingClause) sharedFilters.push(pricingClause);

    const itemFilters: SQL[] = [...sharedFilters];
    const cursorClause = buildCursorClause(cursor, sort);
    if (cursorClause) itemFilters.push(cursorClause);
    const itemWhere = itemFilters.length ? and(...itemFilters) : undefined;

    // Fetch one extra row so we know whether there's a next page.
    const rows = await db
      .select(LIST_COLUMNS)
      .from(bookmarks)
      .where(itemWhere)
      .orderBy(...buildOrderBy(sort))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const categoryMap = await getCategoryAssignmentsForBookmarkIds(
      items.map((item) => item.id),
      { includeInactive: true },
    );
    const itemsWithCategories = items.map((item) => ({
      ...item,
      categories: categoryMap[item.id] ?? [],
    }));
    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem ? encodeCursor({ id: lastItem.id, title: lastItem.title }, sort) : null;

    // total only on the first page (cursor not supplied) — the client
    // memoises it and decrements locally on delete; revisiting via a fresh
    // page-load picks up the precise count again. We check `cursorRaw`
    // (raw input) rather than `cursor` (parsed result) so the intent reads
    // independently of the malformed-cursor 400 guard above.
    let total: number | null = null;
    if (cursorRaw === undefined) {
      const totalWhere = sharedFilters.length ? and(...sharedFilters) : undefined;
      const totalRow = await db
        .select({ count: count() })
        .from(bookmarks)
        .where(totalWhere);
      total = Number(totalRow[0]?.count ?? 0);
    }

    return NextResponse.json(
      { items: itemsWithCategories, nextCursor, total },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logger.error("Error fetching bookmarks:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
    }

    const bodyParse = bookmarkCreateSchema.safeParse(await request.json());
    if (!bodyParse.success) {
      return NextResponse.json(
        { error: "Invalid body", details: bodyParse.error.flatten() },
        { status: 400 },
      );
    }

    const body = bodyParse.data;
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeHttpUrl(body.url);
    } catch (error) {
      if (error instanceof UrlValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
    const slug = body.slug || generateSlug(body.title);
    const categoryIds = normalizeCategorySelection(
      typeof body.categoryId === "number" ? body.categoryId : null,
      Array.isArray(body.categoryIds) ? body.categoryIds : [],
    );

    // Insert first so the audit row can carry the assigned id.
    const inserted = await db.transaction(async (tx) => {
      const rows = await tx.insert(bookmarks).values({
        url: normalizedUrl,
        title: body.title,
        slug,
        description: body.description || null,
        categoryId: categoryIds[0] ?? null,
        overview: body.overview || null,
        favicon: body.favicon || null,
        screenshot: body.screenshot || null,
        ogImage: body.ogImage || null,
        ogTitle: body.ogTitle || null,
        ogDescription: body.ogDescription || null,
        pricingType: body.pricingType,
        whyStartups: body.whyStartups || null,
        alternatives: body.alternatives || null,
        notes: body.notes || null,
        tags: body.tags || null,
        isArchived: body.isArchived ?? false,
        isFavorite: body.isFavorite ?? false,
        isDofollow: body.isDofollow ?? false,
        search_results: body.search_results || null,
        keyFeatures: body.keyFeatures || [],
        useCases: body.useCases || [],
        faqs: body.faqs || [],
      }).returning({ id: bookmarks.id });
      await replaceBookmarkCategories(tx, rows[0].id, categoryIds, {
        source: "manual",
        allowDraft: true,
      });
      return rows;
    });

    logAdminAction({
      actorEmail: auth.email,
      action: "bookmark.create",
      request,
      status: 201,
      targetType: "bookmark",
      targetId: inserted[0]?.id,
      metadata: { url: normalizedUrl, slug },
    });

    // Bust cached bookmark reads (getAllBookmarks, featured/latest, counts).
    revalidateTag(CACHE_TAGS.bookmarks, { expire: 0 });

    return NextResponse.json(
      { message: "Bookmark created successfully", id: inserted[0]?.id },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error creating bookmark:", error);
    return NextResponse.json(
      { error: "Failed to create bookmark" },
      { status: 500 },
    );
  }
}
