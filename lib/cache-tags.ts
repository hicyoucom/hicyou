// Centralised cache-tag names so the `unstable_cache` wrappers in lib/data.ts
// and the mutation invalidation calls stay in lockstep. Add a tag
// here first, then reference the constant on both sides — never hardcode the
// string.
export const CACHE_TAGS = {
  bookmarks: "bookmarks",
  categories: "categories",
  tags: "tags",
  collections: "collections",
  translations: "translations",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
