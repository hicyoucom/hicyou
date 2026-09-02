import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { AutoCollectionCreated } from "@/lib/auto-collections";
import { logger } from "@/lib/logger";

/**
 * Route handlers call this only after a draft was committed. Tag invalidation
 * refreshes the list/sitemap data layer; path invalidation covers any rendered
 * route entries that were already visited before approval.
 */
export function revalidateAutoCollectionPages(
  created: readonly AutoCollectionCreated[],
) {
  if (created.length === 0) return;

  try {
    revalidateTag(CACHE_TAGS.collections, { expire: 0 });
    revalidatePath("/[locale]/collections", "page");
    revalidatePath("/[locale]/collections/[slug]", "page");
  } catch (error) {
    // The committed drafts remain correct even if a platform cache is briefly
    // unavailable. Keep the scheduler response successful and surface the
    // cache issue through structured application logs instead.
    logger.error("[auto-collections] cache invalidation failed:", error);
  }
}
