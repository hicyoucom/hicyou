import * as nextCache from "next/cache";
import { CACHE_TAGS, bookmarkTag, sitemapBucketTag } from "@/lib/cache-tags";
import { locales } from "@/i18n/config";

type BookmarkCacheEntry = { id: number; slug: string };

/** Invalidate an entity and the lists that display it. Counts change only on
 * membership edits; sitemap XML is partitioned so only its bucket expires. */
export function invalidateBookmark(
  entry: BookmarkCacheEntry,
  options: {
    previousSlug?: string;
    membershipChanged?: boolean;
  } = {},
) {
  const tags = [
    bookmarkTag(entry.id),
    CACHE_TAGS.bookmarkLists,
    CACHE_TAGS.adminBookmarks,
    sitemapBucketTag(entry.id),
  ];
  if (options.membershipChanged) {
    tags.push(CACHE_TAGS.bookmarkCounts, CACHE_TAGS.sitemapIndex);
    // Membership changes can alter any product's related recommendations.
    nextCache.revalidatePath("/[locale]/[slug]", "page");
  }
  for (const tag of tags) nextCache.revalidateTag(tag, { expire: 0 });
  for (const slug of new Set(
    [entry.slug, options.previousSlug].filter(Boolean),
  )) {
    for (const locale of locales) {
      nextCache.revalidatePath(`/${locale}/${encodeURIComponent(slug!)}`);
    }
  }
}

/** Bulk publication also invalidates cached 404s, which have no entity tag. */
export function invalidateAllBookmarks() {
  nextCache.revalidateTag(CACHE_TAGS.bookmarks, { expire: 0 });
  nextCache.revalidatePath("/[locale]/[slug]", "page");
}
