// Data access for the public API (/api/v1). Keeps Drizzle out of route
// handlers; returns already-serialized Product resources.
import { db } from "@/db/client";
import {
  bookmarks,
  categories,
  bookmarkCategories,
  tags,
  bookmarkTags,
  translations,
} from "@/db/schema";
import { and, eq, exists, gt, gte, or, asc, inArray, sql, type SQL } from "drizzle-orm";
import { publicBookmarkCondition } from "@/lib/public-bookmark";
import {
  serializeProduct,
  type Product,
  type SerializeInput,
  type ProductTranslations,
} from "@/app/api/v1/_lib/serialize";
import {
  encodeCursor,
  decodeCursor,
  type Cursor,
} from "@/app/api/v1/_lib/cursor";

// DB translation field -> public Product field name.
const TRANSLATION_FIELD_MAP: Record<string, string> = {
  title: "name",
  description: "tagline",
  overview: "description",
};

const PRODUCT_COLUMNS = {
  id: bookmarks.id,
  slug: bookmarks.slug,
  url: bookmarks.url,
  title: bookmarks.title,
  description: bookmarks.description,
  overview: bookmarks.overview,
  favicon: bookmarks.favicon,
  screenshot: bookmarks.screenshot,
  ogImage: bookmarks.ogImage,
  pricingType: bookmarks.pricingType,
  isDofollow: bookmarks.isDofollow,
  categoryId: bookmarks.categoryId,
  categorySlug: categories.slug,
  categoryName: categories.name,
  alternatives: bookmarks.alternatives,
  keyFeatures: bookmarks.keyFeatures,
  useCases: bookmarks.useCases,
  faqs: bookmarks.faqs,
  whyStartups: bookmarks.whyStartups,
  publishedAt: bookmarks.publishedAt,
  createdAt: bookmarks.createdAt,
  updatedAt: bookmarks.updatedAt,
  deletedAt: bookmarks.deletedAt,
} as const;

async function tagsFor(ids: number[]): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  if (!ids.length) return map;
  const rows = await db
    .select({ bookmarkId: bookmarkTags.bookmarkId, slug: tags.slug })
    .from(bookmarkTags)
    .innerJoin(tags, eq(bookmarkTags.tagId, tags.id))
    .where(inArray(bookmarkTags.bookmarkId, ids));
  for (const r of rows) {
    const arr = map.get(r.bookmarkId) ?? [];
    arr.push(r.slug);
    map.set(r.bookmarkId, arr);
  }
  return map;
}

type PublicCategoryAssignment = {
  slug: string;
  name: string;
  primary: boolean;
};

async function categoriesFor(
  ids: number[],
): Promise<Map<number, PublicCategoryAssignment[]>> {
  const map = new Map<number, PublicCategoryAssignment[]>();
  if (!ids.length) return map;
  const rows = await db
    .select({
      bookmarkId: bookmarkCategories.bookmarkId,
      position: bookmarkCategories.position,
      slug: categories.slug,
      name: categories.name,
    })
    .from(bookmarkCategories)
    .innerJoin(categories, eq(bookmarkCategories.categoryId, categories.id))
    .where(
      and(
        inArray(bookmarkCategories.bookmarkId, ids),
        eq(categories.status, "active"),
      ),
    )
    .orderBy(
      asc(bookmarkCategories.bookmarkId),
      asc(bookmarkCategories.position),
    );
  for (const row of rows) {
    const assigned = map.get(row.bookmarkId) ?? [];
    assigned.push({
      slug: row.slug,
      name: row.name,
      primary: row.position === 0,
    });
    map.set(row.bookmarkId, assigned);
  }
  return map;
}

async function translationsFor(
  ids: number[],
  locales?: string[],
): Promise<Map<number, ProductTranslations>> {
  const map = new Map<number, ProductTranslations>();
  if (!ids.length) return map;
  const conds: SQL[] = [
    eq(translations.entityType, "bookmark"),
    inArray(translations.entityId, ids),
  ];
  if (locales && locales.length)
    conds.push(inArray(translations.locale, locales));
  const rows = await db
    .select({
      entityId: translations.entityId,
      locale: translations.locale,
      field: translations.field,
      value: translations.value,
    })
    .from(translations)
    .where(and(...conds));
  for (const r of rows) {
    const byLocale = map.get(r.entityId) ?? {};
    const fields = byLocale[r.locale] ?? {};
    fields[TRANSLATION_FIELD_MAP[r.field] ?? r.field] = r.value;
    byLocale[r.locale] = fields;
    map.set(r.entityId, byLocale);
  }
  return map;
}

type ProductRow = Omit<
  SerializeInput,
  "category" | "categories" | "tags" | "translations"
> & {
  categorySlug: string | null;
  categoryName: string | null;
};

function toInput(
  row: ProductRow,
  tagMap: Map<number, string[]>,
  categoryMap: Map<number, PublicCategoryAssignment[]>,
  trMap?: Map<number, ProductTranslations>,
): SerializeInput {
  const primaryCategory = row.categorySlug && row.categoryName
    ? { slug: row.categorySlug, name: row.categoryName }
    : null;
  const assignedCategories = categoryMap.get(row.id);
  return {
    id: row.id,
    slug: row.slug,
    url: row.url,
    title: row.title,
    description: row.description,
    overview: row.overview,
    favicon: row.favicon,
    screenshot: row.screenshot,
    ogImage: row.ogImage,
    pricingType: row.pricingType,
    isDofollow: row.isDofollow,
    category: primaryCategory,
    categories:
      assignedCategories ??
      (primaryCategory ? [{ ...primaryCategory, primary: true }] : []),
    tags: tagMap.get(row.id) ?? [],
    alternatives: row.alternatives,
    keyFeatures: row.keyFeatures,
    useCases: row.useCases,
    faqs: row.faqs,
    whyStartups: row.whyStartups,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    translations: trMap?.get(row.id),
  };
}

export interface ListOptions {
  updatedSince?: Date;
  cursor?: string | null;
  limit: number;
  categorySlug?: string;
  locales?: string[];
  include: Set<string>;
}

export interface ListResult {
  data: Product[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Full-microsecond-precision timestamp text for keyset cursors. JS Date only
// holds milliseconds, so a Date-based cursor truncates Postgres' microseconds
// and can duplicate/skip rows at a page boundary. We carry the DB's own
// `to_char(...US)` string and compare it back via `::timestamp`.
const UPDATED_ISO = sql<string>`to_char(${bookmarks.updatedAt}, 'YYYY-MM-DD"T"HH24:MI:SS.US')`;

export async function listProducts(opts: ListOptions): Promise<ListResult> {
  const cur: Cursor | null = decodeCursor(opts.cursor);
  const conds: SQL[] = [publicBookmarkCondition()];
  if (opts.updatedSince)
    conds.push(gte(bookmarks.updatedAt, opts.updatedSince));
  if (opts.categorySlug) {
    conds.push(
      exists(
        db
          .select({ id: bookmarkCategories.bookmarkId })
          .from(bookmarkCategories)
          .innerJoin(
            categories,
            eq(bookmarkCategories.categoryId, categories.id),
          )
          .where(
            and(
              eq(bookmarkCategories.bookmarkId, bookmarks.id),
              eq(categories.slug, opts.categorySlug),
              eq(categories.status, "active"),
            ),
          ),
      ),
    );
  }
  if (cur) {
    conds.push(
      or(
        sql`${bookmarks.updatedAt} > ${cur.t}::timestamp`,
        and(
          sql`${bookmarks.updatedAt} = ${cur.t}::timestamp`,
          gt(bookmarks.id, cur.i),
        ),
      )!,
    );
  }

  const rows = await db
    .select({ ...PRODUCT_COLUMNS, cursorTs: UPDATED_ISO })
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(and(...conds))
    .orderBy(asc(bookmarks.updatedAt), asc(bookmarks.id))
    .limit(opts.limit + 1);

  const hasMore = rows.length > opts.limit;
  const page = hasMore ? rows.slice(0, opts.limit) : rows;
  const ids = page.map((r) => r.id);
  const [tagMap, categoryMap, trMap] = await Promise.all([
    tagsFor(ids),
    categoriesFor(ids),
    opts.locales && opts.locales.length
      ? translationsFor(ids, opts.locales)
      : Promise.resolve(undefined),
  ]);

  const data = page.map((r) =>
    serializeProduct(toInput(r, tagMap, categoryMap, trMap), { include: opts.include }),
  );
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor({ t: last.cursorTs, i: last.id }) : null;
  return { data, nextCursor, hasMore };
}

export interface SearchOptions {
  limit: number;
  locales?: string[];
  include: Set<string>;
}

/** Substring search over name/tagline/description of published products. */
export async function searchProducts(
  q: string,
  opts: SearchOptions,
): Promise<Product[]> {
  const term = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`; // escape LIKE metachars
  const rows = await db
    .select(PRODUCT_COLUMNS)
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(
      and(
        publicBookmarkCondition(),
        or(
          sql`${bookmarks.title} ILIKE ${term}`,
          sql`${bookmarks.description} ILIKE ${term}`,
          sql`${bookmarks.overview} ILIKE ${term}`,
        ),
      ),
    )
    // Title matches first, then most-recently updated; id as a stable tie-breaker.
    .orderBy(
      sql`(${bookmarks.title} ILIKE ${term}) DESC`,
      sql`${bookmarks.updatedAt} DESC`,
      sql`${bookmarks.id} DESC`,
    )
    .limit(opts.limit);

  const ids = rows.map((r) => r.id);
  const [tagMap, categoryMap, trMap] = await Promise.all([
    tagsFor(ids),
    categoriesFor(ids),
    opts.locales && opts.locales.length
      ? translationsFor(ids, opts.locales)
      : Promise.resolve(undefined),
  ]);
  return rows.map((r) =>
    serializeProduct(toInput(r, tagMap, categoryMap, trMap), { include: opts.include }),
  );
}

export async function getProductBySlug(
  slug: string,
  include: Set<string>,
): Promise<Product | null> {
  const [row] = await db
    .select(PRODUCT_COLUMNS)
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(and(eq(bookmarks.slug, slug), publicBookmarkCondition()))
    .limit(1);
  if (!row) return null;
  const [tagMap, categoryMap, trMap] = await Promise.all([
    tagsFor([row.id]),
    categoriesFor([row.id]),
    translationsFor([row.id]),
  ]);
  return serializeProduct(toInput(row, tagMap, categoryMap, trMap), { include });
}

export type ChangeEntry =
  | { type: "upsert"; slug: string; updated_at: string; product: Product }
  // source_id (stable bookmarks.id) lets consumers match local rows even when
  // the slug was renamed before deletion.
  | { type: "delete"; slug: string; source_id: number; deleted_at: string };

export interface ChangesResult {
  data: ChangeEntry[];
  nextCursor: string | null;
  hasMore: boolean;
}

// effective change timestamp = COALESCE(deleted_at, updated_at) (when the row
// last changed in a way consumers care about), with µs-precision cursor text.
const EFFECTIVE_TS = sql<Date>`COALESCE(${bookmarks.deletedAt}, ${bookmarks.updatedAt})`;
const EFFECTIVE_ISO = sql<string>`to_char(COALESCE(${bookmarks.deletedAt}, ${bookmarks.updatedAt}), 'YYYY-MM-DD"T"HH24:MI:SS.US')`;

function isVisible(r: {
  status: string | null;
  isArchived: boolean | null;
  deletedAt: Date | null;
}): boolean {
  return r.status === "published" && !r.isArchived && !r.deletedAt;
}

export async function listChanges(
  since: Date,
  cursorRaw: string | null,
  limit: number,
  include?: Set<string>,
  locales?: string[],
): Promise<ChangesResult> {
  const cur = decodeCursor(cursorRaw);
  // A row that changed in the window is an `upsert` if currently visible, else
  // a `delete` tombstone — this covers delete AND unpublish/archive transitions
  // uniformly. (Never-public drafts would also tombstone on edit, which is
  // harmless no-op noise for consumers; no draft-create path exists today.)
  const conds: SQL[] = [
    or(gte(bookmarks.updatedAt, since), gte(bookmarks.deletedAt, since))!,
  ];
  if (cur) {
    conds.push(
      or(
        sql`COALESCE(${bookmarks.deletedAt}, ${bookmarks.updatedAt}) > ${cur.t}::timestamp`,
        and(
          sql`COALESCE(${bookmarks.deletedAt}, ${bookmarks.updatedAt}) = ${cur.t}::timestamp`,
          gt(bookmarks.id, cur.i),
        ),
      )!,
    );
  }

  const rows = await db
    .select({
      ...PRODUCT_COLUMNS,
      cursorTs: EFFECTIVE_ISO,
      status: bookmarks.status,
      isArchived: bookmarks.isArchived,
    })
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(and(...conds))
    .orderBy(asc(EFFECTIVE_TS), asc(bookmarks.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const upsertIds = page.filter((r) => isVisible(r)).map((r) => r.id);
  const [tagMap, categoryMap, trMap] = await Promise.all([
    tagsFor(upsertIds),
    categoriesFor(upsertIds),
    locales && locales.length
      ? translationsFor(upsertIds, locales)
      : Promise.resolve(undefined),
  ]);

  const data: ChangeEntry[] = page.map((r) => {
    if (!isVisible(r)) {
      // deleted, unpublished, or archived → tombstone. Use deletedAt when
      // present, else the update time that removed it from public view.
      return {
        type: "delete",
        slug: r.slug,
        source_id: r.id,
        deleted_at: new Date(r.deletedAt ?? r.updatedAt).toISOString(),
      };
    }
    return {
      type: "upsert",
      slug: r.slug,
      updated_at: new Date(r.updatedAt).toISOString(),
      product: serializeProduct(toInput(r, tagMap, categoryMap, trMap), {
        include: include ?? new Set(["tags"]),
      }),
    };
  });

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor({ t: last.cursorTs, i: last.id }) : null;
  return { data, nextCursor, hasMore };
}

export async function listCategories(locales?: string[]) {
  const cats = await db
    .select({
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      color: categories.color,
      icon: categories.icon,
      group: categories.groupKey,
      id: categories.id,
    })
    .from(categories)
    .where(eq(categories.status, "active"))
    .orderBy(asc(categories.sortOrder));

  const trMap = new Map<number, ProductTranslations>();
  if (locales && locales.length) {
    const rows = await db
      .select({
        entityId: translations.entityId,
        locale: translations.locale,
        field: translations.field,
        value: translations.value,
      })
      .from(translations)
      .where(
        and(
          eq(translations.entityType, "category"),
          inArray(translations.locale, locales),
        ),
      );
    for (const r of rows) {
      const byLocale = trMap.get(r.entityId) ?? {};
      const fields = byLocale[r.locale] ?? {};
      fields[r.field === "name" ? "name" : r.field] = r.value;
      byLocale[r.locale] = fields;
      trMap.set(r.entityId, byLocale);
    }
  }

  return cats.map(({ id, ...c }) => ({ ...c, i18n: trMap.get(id) }));
}

export async function listTags() {
  const rows = await db
    .select({
      slug: tags.slug,
      name: tags.name,
      color: tags.color,
      icon: tags.icon,
    })
    .from(tags)
    .orderBy(asc(tags.name));
  return rows;
}
