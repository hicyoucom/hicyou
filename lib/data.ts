// Hot DB-read helpers. Six wrapped in `unstable_cache` (revalidate 1h, tagged
// via CACHE_TAGS); mutations in lib/actions.ts call `invalidate(...)` after
// the path-based revalidation. When Next 16 / Cache Components land, all
// six callsites convert to `'use cache' + cacheTag + cacheLife` per the
// plan in docs/NEXT_16_MIGRATION.md (Stage 2).
import { db } from "@/db/client";
import {
  bookmarks,
  categories,
  bookmarkCategories,
  tags,
  bookmarkTags,
  collections,
  collectionBookmarks,
  translations,
} from "@/db/schema";
import {
  eq,
  asc,
  desc,
  count,
  ilike,
  or,
  and,
  inArray,
  isNull,
  exists,
  ne,
  type SQL,
} from "drizzle-orm";
import * as nextCache from "next/cache";
import { cache } from "react";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { publicBookmarkCondition } from "@/lib/public-bookmark";
import {
  isTranslationComplete,
  type TranslationEntity,
  type TranslationEntityType,
} from "@/lib/translation-fields";

// Bun's ESM test loader cannot statically discover named exports from Next
// 16's dynamic CommonJS cache bridge. A namespace import is equivalent in
// Next at runtime and also keeps integration modules importable when skipped.
const { unstable_cache } = nextCache;

export type Bookmark = typeof bookmarks.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type CategoryAssignment = Category & { position: number };
export type BookmarkWithCategories = Bookmark & {
  category: Category | null;
  categories: CategoryAssignment[];
};

export async function getCategoryAssignmentsForBookmarkIds(
  bookmarkIds: number[],
  options: { includeInactive?: boolean } = {},
): Promise<Record<number, CategoryAssignment[]>> {
  if (!process.env.DATABASE_URL || bookmarkIds.length === 0) return {};

  const rows = await db
    .select({
      bookmarkId: bookmarkCategories.bookmarkId,
      position: bookmarkCategories.position,
      category: categories,
    })
    .from(bookmarkCategories)
    .innerJoin(categories, eq(bookmarkCategories.categoryId, categories.id))
    .where(
      and(
        inArray(bookmarkCategories.bookmarkId, bookmarkIds),
        options.includeInactive ? undefined : eq(categories.status, "active"),
      ),
    )
    .orderBy(
      asc(bookmarkCategories.bookmarkId),
      asc(bookmarkCategories.position),
    );

  const assignments: Record<number, CategoryAssignment[]> = {};
  for (const row of rows) {
    (assignments[row.bookmarkId] ??= []).push({
      ...row.category,
      position: row.position,
    });
  }
  return assignments;
}

export const getAllBookmarks = unstable_cache(
  async (): Promise<BookmarkWithCategories[]> => {
    if (!process.env.DATABASE_URL) {
      return [];
    }
    const results = await db
      .select({
        id: bookmarks.id,
        title: bookmarks.title,
        url: bookmarks.url,
        slug: bookmarks.slug,
        description: bookmarks.description,
        categoryId: bookmarks.categoryId,
        favicon: bookmarks.favicon,
        ogImage: bookmarks.ogImage,
        overview: bookmarks.overview,
        isArchived: bookmarks.isArchived,
        isFavorite: bookmarks.isFavorite,
        isDofollow: bookmarks.isDofollow,
        createdAt: bookmarks.createdAt,
        updatedAt: bookmarks.updatedAt,
        // Minimal selection for the admin overview and internal callers.
        category: categories,
      })
      .from(bookmarks)
      .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
      .where(isNull(bookmarks.deletedAt));

    const categoryMap = await getCategoryAssignmentsForBookmarkIds(
      results.map((row) => row.id),
      { includeInactive: true },
    );
    return results.map((row) => ({
      ...row,
      category: row.category,
      categories: categoryMap[row.id] ?? [],
    })) as unknown as BookmarkWithCategories[];
  },
  ["data:getAllBookmarks"],
  { revalidate: 3600, tags: [CACHE_TAGS.bookmarks] },
);

/**
 * The sitemap needs only public URLs and their true record update time. Keep
 * this narrow instead of loading the admin-facing bookmark list and filtering
 * it in memory.
 */
export const getPublicBookmarkSitemapEntries = unstable_cache(
  async (): Promise<{ slug: string; updatedAt: string }[]> => {
    if (!process.env.DATABASE_URL) return [];

    const rows = await db
      .select({ slug: bookmarks.slug, updatedAt: bookmarks.updatedAt })
      .from(bookmarks)
      .where(publicBookmarkCondition());

    // unstable_cache serializes its return value. Emit the sitemap's native
    // wire format explicitly instead of relying on Date round-tripping.
    return rows.map((row) => ({
      slug: row.slug,
      updatedAt: row.updatedAt.toISOString(),
    }));
  },
  ["data:getPublicBookmarkSitemapEntries"],
  { revalidate: 3600, tags: [CACHE_TAGS.bookmarks] },
);

/**
 * SQL-side aggregation: Record<categoryId, count> of publicly visible bookmarks.
 * Replaces the in-memory count loop in /[locale]/c that previously pulled
 * every bookmark row. Returns a plain object (not Map) because unstable_cache
 * JSON-serialises values and Map does not survive the round trip.
 */
export type CategoryCounts = Record<number, number>;

export const getCategoryBookmarkCounts = unstable_cache(
  async (): Promise<CategoryCounts> => {
    if (!process.env.DATABASE_URL) return {};
    const rows = await db
      .select({
        categoryId: bookmarkCategories.categoryId,
        count: count(),
      })
      .from(bookmarkCategories)
      .innerJoin(bookmarks, eq(bookmarkCategories.bookmarkId, bookmarks.id))
      .innerJoin(categories, eq(bookmarkCategories.categoryId, categories.id))
      .where(and(publicBookmarkCondition(), eq(categories.status, "active")))
      .groupBy(bookmarkCategories.categoryId);
    const out: CategoryCounts = {};
    for (const r of rows) {
      if (r.categoryId !== null) out[r.categoryId] = Number(r.count);
    }
    return out;
  },
  ["data:getCategoryBookmarkCounts"],
  { revalidate: 3600, tags: [CACHE_TAGS.bookmarks, CACHE_TAGS.categories] },
);

/**
 * SQL-side fetch of a single category's bookmarks with optional search and
 * pagination. Replaces the old pattern of pulling every bookmark via
 * getAllBookmarks() and filtering in memory on the category page — cost now
 * scales with the category size, not the whole table. Returns the page slice
 * plus the total matching count (for pagination).
 */
export async function getBookmarksByCategory(
  categoryId: number,
  opts: { search?: string; page?: number; pageSize?: number } = {},
): Promise<{
  bookmarks: (Bookmark & { category: Category | null })[];
  total: number;
}> {
  if (!process.env.DATABASE_URL) return { bookmarks: [], total: 0 };

  const page = Math.max(opts.page ?? 1, 1);
  const pageSize = opts.pageSize ?? 30;
  const conditions: SQL[] = [
    eq(bookmarkCategories.categoryId, categoryId),
    publicBookmarkCondition(),
  ];

  if (opts.search) {
    const pattern = `%${opts.search}%`;
    conditions.push(
      or(
        ilike(bookmarks.title, pattern),
        ilike(bookmarks.description, pattern),
        ilike(bookmarks.overview, pattern),
      )!,
    );
  }

  const where = and(...conditions);

  const [countResult, results] = await Promise.all([
    db
      .select({ count: count() })
      .from(bookmarkCategories)
      .innerJoin(bookmarks, eq(bookmarkCategories.bookmarkId, bookmarks.id))
      .where(where),
    db
      .select({
        id: bookmarks.id,
        title: bookmarks.title,
        url: bookmarks.url,
        slug: bookmarks.slug,
        description: bookmarks.description,
        categoryId: bookmarks.categoryId,
        favicon: bookmarks.favicon,
        ogImage: bookmarks.ogImage,
        overview: bookmarks.overview,
        isArchived: bookmarks.isArchived,
        isFavorite: bookmarks.isFavorite,
        isDofollow: bookmarks.isDofollow,
        createdAt: bookmarks.createdAt,
        updatedAt: bookmarks.updatedAt,
        category: categories,
      })
      .from(bookmarkCategories)
      .innerJoin(bookmarks, eq(bookmarkCategories.bookmarkId, bookmarks.id))
      .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
      .where(where)
      .orderBy(desc(bookmarks.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  return {
    bookmarks: results.map((row) => ({
      ...row,
      category: row.category,
    })) as unknown as (Bookmark & { category: Category | null })[],
    total: countResult[0].count,
  };
}

export async function getRelatedBookmarks(
  categoryIds: number | number[],
  excludeId: number,
  limit = 4,
): Promise<(Bookmark & { category: Category | null })[]> {
  if (!process.env.DATABASE_URL) {
    return [];
  }
  const ids = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
  if (ids.length === 0) return [];
  const candidates = await db
    .select({
      id: bookmarks.id,
      overlap: count(),
      createdAt: bookmarks.createdAt,
    })
    .from(bookmarkCategories)
    .innerJoin(bookmarks, eq(bookmarkCategories.bookmarkId, bookmarks.id))
    .where(
      and(
        inArray(bookmarkCategories.categoryId, ids),
        ne(bookmarks.id, excludeId),
        publicBookmarkCondition(),
      ),
    )
    .groupBy(bookmarks.id)
    .orderBy(desc(count()), desc(bookmarks.createdAt))
    .limit(limit);
  if (candidates.length === 0) return [];

  const results = await db
    .select({
      id: bookmarks.id,
      title: bookmarks.title,
      url: bookmarks.url,
      slug: bookmarks.slug,
      description: bookmarks.description,
      categoryId: bookmarks.categoryId,
      favicon: bookmarks.favicon,
      ogImage: bookmarks.ogImage,
      overview: bookmarks.overview,
      isArchived: bookmarks.isArchived,
      isFavorite: bookmarks.isFavorite,
      isDofollow: bookmarks.isDofollow,
      createdAt: bookmarks.createdAt,
      updatedAt: bookmarks.updatedAt,
      category: categories,
    })
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(
      inArray(
        bookmarks.id,
        candidates.map((candidate) => candidate.id),
      ),
    );

  const byId = new Map(results.map((row) => [row.id, row]));
  return candidates
    .map((candidate) => byId.get(candidate.id))
    .filter(
      (row): row is (typeof results)[number] => row !== undefined,
    ) as unknown as (Bookmark & { category: Category | null })[];
}

export const getBookmarksCount = unstable_cache(
  async (): Promise<number> => {
    if (!process.env.DATABASE_URL) {
      return 0;
    }
    const result = await db
      .select({ count: count() })
      .from(bookmarks)
      .where(publicBookmarkCondition());
    return result[0].count;
  },
  ["data:getBookmarksCount"],
  { revalidate: 3600, tags: [CACHE_TAGS.bookmarks] },
);

export async function searchBookmarks(
  term: string,
): Promise<(Bookmark & { category: Category | null })[]> {
  if (!process.env.DATABASE_URL) {
    return [];
  }
  const searchPattern = `%${term}%`;
  const results = await db
    .select({
      id: bookmarks.id,
      title: bookmarks.title,
      url: bookmarks.url,
      slug: bookmarks.slug,
      description: bookmarks.description,
      categoryId: bookmarks.categoryId,
      favicon: bookmarks.favicon,
      ogImage: bookmarks.ogImage,
      overview: bookmarks.overview, // needed for search highlighting or context
      isArchived: bookmarks.isArchived,
      isFavorite: bookmarks.isFavorite,
      isDofollow: bookmarks.isDofollow,
      category: categories,
    })
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(
      and(
        publicBookmarkCondition(),
        or(
          ilike(bookmarks.title, searchPattern),
          ilike(bookmarks.description, searchPattern),
          ilike(bookmarks.overview, searchPattern),
          // `notes` is an internal/private field — excluded from public search
          // to avoid leaking note contents via the result side channel.
          ilike(categories.name, searchPattern),
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
                  ilike(categories.name, searchPattern),
                  eq(categories.status, "active"),
                ),
              ),
          ),
        ),
      ),
    )
    .orderBy(desc(bookmarks.createdAt))
    .limit(50);

  return results.map((row) => ({
    ...row,
    category: row.category,
  })) as unknown as (Bookmark & { category: Category | null })[];
}

export const getAllCategories = unstable_cache(
  async (includeInactive = false): Promise<Category[]> => {
    if (!process.env.DATABASE_URL) {
      return [];
    }
    return await db
      .select()
      .from(categories)
      .where(includeInactive ? undefined : eq(categories.status, "active"))
      .orderBy(asc(categories.sortOrder), asc(categories.id));
  },
  // v3 invalidates pre-localization category names after migration 0026.
  ["data:getAllCategories:v3"],
  { revalidate: 3600, tags: [CACHE_TAGS.categories] },
);

/**
 * Get all categories with translations applied for a given locale.
 */
export async function getAllCategoriesTranslated(
  locale: string,
): Promise<Category[]> {
  const cats = await getAllCategories(false);
  if (locale === "en" || !cats.length) return cats;
  const tMap = await getTranslationsForEntities(
    "category",
    cats.map((c) => c.id),
    locale,
  );
  return cats.map((c) => applyTranslations(c, tMap));
}

// React cache() dedupes per RSC request (generateMetadata + Page share one
// render pass and used to each run these queries). RSC pages only — do NOT
// call cache()-wrapped functions from Route Handlers or Server Actions.
async function _getBookmarkBySlug(
  slug: string,
): Promise<BookmarkWithCategories | null> {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  const results = await db
    .select()
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(and(eq(bookmarks.slug, slug), publicBookmarkCondition()))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const categoryMap = await getCategoryAssignmentsForBookmarkIds([
    results[0].bookmarks.id,
  ]);
  return {
    ...results[0].bookmarks,
    category: results[0].categories,
    categories: categoryMap[results[0].bookmarks.id] ?? [],
  };
}

export const getBookmarkBySlug = cache(_getBookmarkBySlug);

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  const results = await db
    .select()
    .from(categories)
    .where(and(eq(categories.slug, slug), eq(categories.status, "active")))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  return results[0];
}

/**
 * Get a category by slug with translations applied for a given locale.
 */
export async function getCategoryBySlugTranslated(
  slug: string,
  locale: string,
): Promise<Category | null> {
  const cat = await getCategoryBySlug(slug);
  if (!cat || locale === "en") return cat;
  const tMap = await getTranslationsForEntities("category", [cat.id], locale);
  return applyTranslations(cat, tMap);
}

// Get featured bookmarks (isFavorite = true). Cached: the homepage renders
// this on every request, but the underlying data changes rarely. `limit` is
// part of the cache key, so distinct limits get distinct slots.
export const getFeaturedBookmarks = unstable_cache(
  async (
    limit: number = 4,
  ): Promise<(Bookmark & { category: Category | null })[]> => {
    if (!process.env.DATABASE_URL) {
      return [];
    }
    const results = await db
      .select({
        id: bookmarks.id,
        title: bookmarks.title,
        url: bookmarks.url,
        slug: bookmarks.slug,
        description: bookmarks.description,
        categoryId: bookmarks.categoryId,
        favicon: bookmarks.favicon,
        ogImage: bookmarks.ogImage,
        overview: bookmarks.overview,
        isArchived: bookmarks.isArchived,
        isFavorite: bookmarks.isFavorite,
        isDofollow: bookmarks.isDofollow,
        category: categories,
      })
      .from(bookmarks)
      .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
      .where(and(eq(bookmarks.isFavorite, true), publicBookmarkCondition()))
      .limit(limit);

    return results.map((row) => ({
      ...row,
      category: row.category,
    })) as unknown as (Bookmark & { category: Category | null })[];
  },
  ["data:getFeaturedBookmarks"],
  { revalidate: 3600, tags: [CACHE_TAGS.bookmarks] },
);

// Get latest bookmarks ordered by creation date. Cached like the above —
// busted via CACHE_TAGS.bookmarks whenever a bookmark mutates.
export const getLatestBookmarks = unstable_cache(
  async (
    limit: number = 30,
  ): Promise<(Bookmark & { category: Category | null })[]> => {
    if (!process.env.DATABASE_URL) {
      return [];
    }
    const results = await db
      .select({
        id: bookmarks.id,
        title: bookmarks.title,
        url: bookmarks.url,
        slug: bookmarks.slug,
        description: bookmarks.description,
        categoryId: bookmarks.categoryId,
        favicon: bookmarks.favicon,
        ogImage: bookmarks.ogImage,
        overview: bookmarks.overview,
        isArchived: bookmarks.isArchived,
        isFavorite: bookmarks.isFavorite,
        isDofollow: bookmarks.isDofollow,
        createdAt: bookmarks.createdAt,
        category: categories,
      })
      .from(bookmarks)
      .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
      .where(publicBookmarkCondition())
      .orderBy(desc(bookmarks.createdAt))
      .limit(limit);

    return results.map((row) => ({
      ...row,
      category: row.category,
    })) as unknown as (Bookmark & { category: Category | null })[];
  },
  ["data:getLatestBookmarks"],
  { revalidate: 3600, tags: [CACHE_TAGS.bookmarks] },
);

// ============ Tag Queries ============

export const getAllTags = unstable_cache(
  async (): Promise<Tag[]> => {
    if (!process.env.DATABASE_URL) return [];
    return await db.select().from(tags).orderBy(asc(tags.name));
  },
  ["data:getAllTags"],
  { revalidate: 3600, tags: [CACHE_TAGS.tags] },
);

async function _getTagBySlug(slug: string): Promise<Tag | null> {
  if (!process.env.DATABASE_URL) return null;
  const results = await db
    .select()
    .from(tags)
    .where(eq(tags.slug, slug))
    .limit(1);
  return results[0] || null;
}

// cache(): RSC pages only (see getBookmarkBySlug note).
export const getTagBySlug = cache(_getTagBySlug);

export async function getTagsWithCount(): Promise<(Tag & { count: number })[]> {
  if (!process.env.DATABASE_URL) return [];
  const results = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      color: tags.color,
      icon: tags.icon,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
      count: count(bookmarkTags.bookmarkId),
    })
    .from(tags)
    .innerJoin(bookmarkTags, eq(tags.id, bookmarkTags.tagId))
    .innerJoin(bookmarks, eq(bookmarkTags.bookmarkId, bookmarks.id))
    .where(publicBookmarkCondition())
    .groupBy(tags.id)
    .orderBy(asc(tags.name));
  return results;
}

export async function getBookmarksByTagSlug(
  tagSlug: string,
  page: number = 1,
  pageSize: number = 30,
): Promise<{
  bookmarks: (Bookmark & { category: Category | null })[];
  total: number;
}> {
  if (!process.env.DATABASE_URL) return { bookmarks: [], total: 0 };

  const tag = await getTagBySlug(tagSlug);
  if (!tag) return { bookmarks: [], total: 0 };

  const [countResult, results] = await Promise.all([
    db
      .select({ count: count() })
      .from(bookmarkTags)
      .innerJoin(bookmarks, eq(bookmarkTags.bookmarkId, bookmarks.id))
      .where(and(eq(bookmarkTags.tagId, tag.id), publicBookmarkCondition())),
    db
      .select({
        id: bookmarks.id,
        title: bookmarks.title,
        url: bookmarks.url,
        slug: bookmarks.slug,
        description: bookmarks.description,
        categoryId: bookmarks.categoryId,
        favicon: bookmarks.favicon,
        ogImage: bookmarks.ogImage,
        overview: bookmarks.overview,
        isArchived: bookmarks.isArchived,
        isFavorite: bookmarks.isFavorite,
        isDofollow: bookmarks.isDofollow,
        createdAt: bookmarks.createdAt,
        category: categories,
      })
      .from(bookmarkTags)
      .innerJoin(bookmarks, eq(bookmarkTags.bookmarkId, bookmarks.id))
      .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
      .where(and(eq(bookmarkTags.tagId, tag.id), publicBookmarkCondition()))
      .orderBy(desc(bookmarks.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  return {
    bookmarks: results.map((row) => ({
      ...row,
      category: row.category,
    })) as unknown as (Bookmark & { category: Category | null })[],
    total: countResult[0].count,
  };
}

export async function getTagsForBookmark(bookmarkId: number): Promise<Tag[]> {
  if (!process.env.DATABASE_URL) return [];
  const results = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      color: tags.color,
      icon: tags.icon,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
    })
    .from(bookmarkTags)
    .innerJoin(tags, eq(bookmarkTags.tagId, tags.id))
    .where(eq(bookmarkTags.bookmarkId, bookmarkId));
  return results;
}

// ============ Collection Queries ============

export const getAllCollections = unstable_cache(
  async (includeUnpublished = false): Promise<Collection[]> => {
    if (!process.env.DATABASE_URL) return [];
    if (!includeUnpublished) {
      return await db
        .select()
        .from(collections)
        .where(eq(collections.status, "published"))
        .orderBy(desc(collections.publishedAt));
    }
    return await db
      .select()
      .from(collections)
      .orderBy(desc(collections.createdAt));
  },
  ["data:getAllCollections"],
  { revalidate: 3600, tags: [CACHE_TAGS.collections] },
);

export async function getCollectionBySlug(
  slug: string,
): Promise<Collection | null> {
  if (!process.env.DATABASE_URL) return null;
  const results = await db
    .select()
    .from(collections)
    .where(and(eq(collections.slug, slug), eq(collections.status, "published")))
    .limit(1);
  return results[0] || null;
}

// Module-private: only used by getCollectionWithBookmarksTranslated below.
async function getCollectionWithBookmarks(slug: string): Promise<{
  collection: Collection;
  bookmarks: (Bookmark & { category: Category | null; note: string | null })[];
} | null> {
  if (!process.env.DATABASE_URL) return null;

  const collection = await getCollectionBySlug(slug);
  if (!collection) return null;

  const results = await db
    .select({
      id: bookmarks.id,
      title: bookmarks.title,
      url: bookmarks.url,
      slug: bookmarks.slug,
      description: bookmarks.description,
      categoryId: bookmarks.categoryId,
      favicon: bookmarks.favicon,
      ogImage: bookmarks.ogImage,
      overview: bookmarks.overview,
      isArchived: bookmarks.isArchived,
      isFavorite: bookmarks.isFavorite,
      isDofollow: bookmarks.isDofollow,
      pricingType: bookmarks.pricingType,
      keyFeatures: bookmarks.keyFeatures,
      createdAt: bookmarks.createdAt,
      category: categories,
      note: collectionBookmarks.note,
      sortOrder: collectionBookmarks.sortOrder,
    })
    .from(collectionBookmarks)
    .innerJoin(bookmarks, eq(collectionBookmarks.bookmarkId, bookmarks.id))
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(
      and(
        eq(collectionBookmarks.collectionId, collection.id),
        publicBookmarkCondition(),
      ),
    )
    .orderBy(asc(collectionBookmarks.sortOrder));

  return {
    collection,
    bookmarks: results.map((row) => ({
      ...row,
      category: row.category,
    })) as unknown as (Bookmark & {
      category: Category | null;
      note: string | null;
    })[],
  };
}

// cache(): RSC pages only (see getBookmarkBySlug note). Dedupes the
// generateMetadata + Page double fetch on collection detail pages.
export const getCollectionWithBookmarksTranslated = cache(
  async (
    slug: string,
    locale: string,
  ): Promise<{
    collection: Collection;
    bookmarks: (Bookmark & {
      category: Category | null;
      note: string | null;
    })[];
  } | null> => {
    const data = await getCollectionWithBookmarks(slug);
    if (!data || locale === "en") return data;

    const { collection, bookmarks: bms } = data;

    // Apply collection translations (title, description, content)
    const collectionTrans = await getTranslationsForEntity(
      "collection",
      collection.id,
      locale,
    );
    const translatedCollection: Collection = {
      ...collection,
      ...(collectionTrans.title ? { title: collectionTrans.title } : {}),
      ...(collectionTrans.description
        ? { description: collectionTrans.description }
        : {}),
      ...(collectionTrans.content ? { content: collectionTrans.content } : {}),
    };

    // Apply bookmark translations (returns new array, does not mutate cached bookmarks)
    let translatedBms = bms;
    if (bms.length > 0) {
      const bmIds = bms.map((b) => b.id);
      const bmTrans = await getTranslationsForEntities(
        "bookmark",
        bmIds,
        locale,
      );
      translatedBms = bms.map((b) => applyTranslations(b, bmTrans));
    }

    return { collection: translatedCollection, bookmarks: translatedBms };
  },
);

export async function getCollectionBookmarkIds(
  collectionId: number,
): Promise<number[]> {
  if (!process.env.DATABASE_URL) return [];
  const results = await db
    .select({ bookmarkId: collectionBookmarks.bookmarkId })
    .from(collectionBookmarks)
    .where(eq(collectionBookmarks.collectionId, collectionId));
  return results.map((r) => r.bookmarkId);
}

// ============ Translation Queries ============

// cache(): RSC pages only (see getBookmarkBySlug note).
export const getTranslationsForEntity = cache(
  async (
    entityType: string,
    entityId: number,
    locale: string,
  ): Promise<Record<string, string>> => {
    if (!process.env.DATABASE_URL) return {};
    const results = await db
      .select({ field: translations.field, value: translations.value })
      .from(translations)
      .where(
        and(
          eq(translations.entityType, entityType),
          eq(translations.entityId, entityId),
          eq(translations.locale, locale),
        ),
      );
    return Object.fromEntries(results.map((r) => [r.field, r.value]));
  },
);

// Lookup shape: entityId → { fieldName → translatedValue }. Used to be a
// `Map`, but unstable_cache JSON-serializes cached values and Map does not
// survive the round trip (it deserialises to `{}` with no `.get`). Plain
// records are the right primitive here.
export type TranslationLookup = Record<number, Record<string, string>>;

// Internal worker. Receives the ids in sorted order so the cache key is
// stable regardless of caller order. unstable_cache builds the key from the
// raw args, so any pre-sort must happen OUTSIDE the wrapper — sorting inside
// the wrapped function would compute a deterministic SQL query but still
// leak duplicate cache slots for the same logical input.
const _getTranslationsForEntitiesCached = unstable_cache(
  async (
    entityType: string,
    sortedIds: number[],
    locale: string,
  ): Promise<TranslationLookup> => {
    if (!process.env.DATABASE_URL || !sortedIds.length || locale === "en") {
      return {};
    }
    const results = await db
      .select({
        entityId: translations.entityId,
        field: translations.field,
        value: translations.value,
      })
      .from(translations)
      .where(
        and(
          eq(translations.entityType, entityType),
          inArray(translations.entityId, sortedIds),
          eq(translations.locale, locale),
        ),
      );

    const out: TranslationLookup = {};
    for (const r of results) {
      if (!out[r.entityId]) out[r.entityId] = {};
      out[r.entityId][r.field] = r.value;
    }
    return out;
  },
  // v2 invalidates incomplete category translations after migration 0026.
  ["data:getTranslationsForEntities:v2"],
  { revalidate: 3600, tags: [CACHE_TAGS.translations] },
);

/**
 * Batch fetch translations for multiple entities. Returns
 * entityId → { field: translatedValue } as a plain object. The id array is
 * sorted before hitting the cached worker so equivalent inputs share a slot.
 */
export async function getTranslationsForEntities(
  entityType: string,
  entityIds: number[],
  locale: string,
): Promise<TranslationLookup> {
  if (!entityIds.length || locale === "en") return {};
  const sortedIds = [...entityIds].sort((a, b) => a - b);
  return _getTranslationsForEntitiesCached(entityType, sortedIds, locale);
}

/**
 * Returns a shallow clone of `item` with translated fields overlaid. Does NOT
 * mutate — important now that `getAllCategories` / `getAllBookmarks` / etc.
 * are wrapped in `unstable_cache`, which can return shared references across
 * concurrent renders. Mutating those would corrupt other requests' views.
 *
 * Always reassign the return value (`xs = xs.map(b => applyTranslations(b, m))`).
 * Bare `.forEach(b => applyTranslations(b, m))` is a no-op.
 */
export function applyTranslations<
  T extends {
    id: number;
    title?: string;
    name?: string;
    description?: string | null;
    overview?: string | null;
  },
>(item: T, translationMap: TranslationLookup): T {
  const t = translationMap[item.id];
  if (!t) return item;
  return {
    ...item,
    ...(t.title && "title" in item ? { title: t.title } : {}),
    ...(t.name && "name" in item ? { name: t.name } : {}),
    ...(t.description ? { description: t.description } : {}),
    ...(t.overview ? { overview: t.overview } : {}),
  };
}

/**
 * Apply detailed translations (including JSON fields) from a flat translation
 * record. Returns a new object — see `applyTranslations` for the rationale.
 * Bookmark detail pages call this with keyFeatures, useCases, faqs,
 * whyStartups translations.
 */
export function applyDetailTranslations<T extends Record<string, unknown>>(
  bookmark: T,
  t: Record<string, string>,
): T {
  // Normalize keys: strip brackets from "[field]" style keys
  const tn: Record<string, string> = {};
  for (const [key, value] of Object.entries(t)) {
    tn[key.replace(/^\[|\]$/g, "")] = value;
  }

  const out: Record<string, unknown> = { ...bookmark };

  if (tn.title) out.title = tn.title;
  if (tn.description) out.description = tn.description;
  if (tn.overview) out.overview = tn.overview;
  if (tn.whyStartups) out.whyStartups = tn.whyStartups;

  const origKeyFeatures = Array.isArray(bookmark.keyFeatures)
    ? (bookmark.keyFeatures as unknown[])
    : [];
  if (origKeyFeatures.length > 0) {
    out.keyFeatures = origKeyFeatures.map((orig, i) => {
      if (typeof orig === "string") {
        return tn[`keyFeatures.${i}`] || orig;
      }
      if (!orig || typeof orig !== "object") return orig;
      const feature = orig as Record<string, unknown>;
      return {
        ...feature,
        ...(tn[`keyFeatures.${i}.name`]
          ? { name: tn[`keyFeatures.${i}.name`] }
          : {}),
        ...(tn[`keyFeatures.${i}.description`]
          ? { description: tn[`keyFeatures.${i}.description`] }
          : {}),
      };
    });
  }

  const origUseCases = Array.isArray(bookmark.useCases)
    ? (bookmark.useCases as string[])
    : [];
  if (origUseCases.length > 0) {
    out.useCases = origUseCases.map((orig, i) => tn[`useCases.${i}`] || orig);
  }

  const origFaqs = Array.isArray(bookmark.faqs)
    ? (bookmark.faqs as { question: string; answer: string }[])
    : [];
  if (origFaqs.length > 0) {
    out.faqs = origFaqs.map((orig, i) => ({
      question: tn[`faqs.${i}.question`] || orig.question,
      answer: tn[`faqs.${i}.answer`] || orig.answer,
    }));
  }

  return out as T;
}

export async function getUntranslatedBookmarkIds(
  locale: string,
): Promise<number[]> {
  if (!process.env.DATABASE_URL) return [];
  const [entities, translatedRows] = await Promise.all([
    db
      .select({
        id: bookmarks.id,
        title: bookmarks.title,
        description: bookmarks.description,
        overview: bookmarks.overview,
        whyStartups: bookmarks.whyStartups,
        keyFeatures: bookmarks.keyFeatures,
        useCases: bookmarks.useCases,
        faqs: bookmarks.faqs,
      })
      .from(bookmarks),
    db
      .select({
        entityId: translations.entityId,
        field: translations.field,
        value: translations.value,
      })
      .from(translations)
      .where(
        and(
          eq(translations.entityType, "bookmark"),
          eq(translations.locale, locale),
        ),
      ),
  ]);
  return incompleteEntityIds("bookmark", entities, translatedRows);
}

export async function getUntranslatedCategoryIds(
  locale: string,
): Promise<number[]> {
  if (!process.env.DATABASE_URL) return [];
  const [entities, translatedRows] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
      })
      .from(categories),
    db
      .select({
        entityId: translations.entityId,
        field: translations.field,
        value: translations.value,
      })
      .from(translations)
      .where(
        and(
          eq(translations.entityType, "category"),
          eq(translations.locale, locale),
        ),
      ),
  ]);
  return incompleteEntityIds("category", entities, translatedRows);
}

type TranslationFieldRow = { entityId: number; field: string; value: string };

function fieldsByEntity(
  rows: readonly TranslationFieldRow[],
): Map<number, Set<string>> {
  const result = new Map<number, Set<string>>();
  for (const row of rows) {
    if (!row.value.trim()) continue;
    const fields = result.get(row.entityId) ?? new Set<string>();
    fields.add(row.field);
    result.set(row.entityId, fields);
  }
  return result;
}

function incompleteEntityIds(
  entityType: TranslationEntityType,
  entities: readonly TranslationEntity[],
  translatedRows: readonly TranslationFieldRow[],
): number[] {
  const translated = fieldsByEntity(translatedRows);
  return entities
    .filter(
      (entity) =>
        !isTranslationComplete(
          entityType,
          entity,
          translated.get(entity.id) ?? new Set(),
        ),
    )
    .map((entity) => entity.id);
}

export type TranslationStat = {
  locale: string;
  localeName: string;
  localeFlag: string;
  translated: number;
  total: number;
  remaining: number;
};

export async function getTranslationStats(): Promise<TranslationStat[]> {
  if (!process.env.DATABASE_URL) return [];

  const { locales, defaultLocale, localeNames, localeFlags } =
    await import("@/i18n/config");

  const [entities, translatedRows] = await Promise.all([
    db
      .select({
        id: bookmarks.id,
        title: bookmarks.title,
        description: bookmarks.description,
        overview: bookmarks.overview,
        whyStartups: bookmarks.whyStartups,
        keyFeatures: bookmarks.keyFeatures,
        useCases: bookmarks.useCases,
        faqs: bookmarks.faqs,
      })
      .from(bookmarks),
    db
      .select({
        locale: translations.locale,
        entityId: translations.entityId,
        field: translations.field,
        value: translations.value,
      })
      .from(translations)
      .where(eq(translations.entityType, "bookmark")),
  ]);

  const total = entities.length;

  return locales
    .filter((l) => l !== defaultLocale)
    .map((locale) => {
      const fields = fieldsByEntity(
        translatedRows.filter((row) => row.locale === locale),
      );
      const translated = entities.filter((entity) =>
        isTranslationComplete(
          "bookmark",
          entity,
          fields.get(entity.id) ?? new Set(),
        ),
      ).length;
      return {
        locale,
        localeName: localeNames[locale],
        localeFlag: localeFlags[locale],
        translated,
        total,
        remaining: total - translated,
      };
    });
}

export async function getCategoryTranslationStats(): Promise<
  TranslationStat[]
> {
  if (!process.env.DATABASE_URL) return [];

  const { locales, defaultLocale, localeNames, localeFlags } =
    await import("@/i18n/config");

  const [entities, translatedRows] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
      })
      .from(categories),
    db
      .select({
        locale: translations.locale,
        entityId: translations.entityId,
        field: translations.field,
        value: translations.value,
      })
      .from(translations)
      .where(eq(translations.entityType, "category")),
  ]);

  const total = entities.length;

  return locales
    .filter((l) => l !== defaultLocale)
    .map((locale) => {
      const fields = fieldsByEntity(
        translatedRows.filter((row) => row.locale === locale),
      );
      const translated = entities.filter((entity) =>
        isTranslationComplete(
          "category",
          entity,
          fields.get(entity.id) ?? new Set(),
        ),
      ).length;
      return {
        locale,
        localeName: localeNames[locale],
        localeFlag: localeFlags[locale],
        translated,
        total,
        remaining: total - translated,
      };
    });
}
