// Centralised cache-tag names so the `unstable_cache` wrappers in lib/data.ts
// and the mutation invalidation calls stay in lockstep. Add a tag
// here first, then reference the constant on both sides — never hardcode the
// string.
export const CACHE_TAGS = {
  // Broad fallback for imports and bulk mutations whose affected IDs are unknown.
  bookmarks: "bookmarks",
  bookmarkLists: "bookmark-lists",
  bookmarkCounts: "bookmark-counts",
  adminBookmarks: "admin-bookmarks",
  sitemapIndex: "sitemap-index",
  categories: "categories",
  tags: "tags",
  collections: "collections",
  translations: "translations",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const bookmarkTag = (id: number) => `bookmark:${id}`;
export const translationTag = (type: string, id: number, locale: string) =>
  `translation:${type}:${id}:${locale}`;
export const SITEMAP_BUCKET_SIZE = 1000;
export const sitemapBucketTag = (id: number) =>
  `sitemap:bookmark:${Math.floor(id / SITEMAP_BUCKET_SIZE)}`;
