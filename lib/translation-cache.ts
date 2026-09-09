import * as nextCache from "next/cache";
import { translationTag } from "@/lib/cache-tags";
/** Cached translation reads carry entity + locale tags, including product ISR. */
export function invalidateEntityTranslations(
  entityType: string,
  entityIds: number[],
  locale: string,
) {
  for (const id of entityIds)
    nextCache.revalidateTag(translationTag(entityType, id, locale), {
      expire: 0,
    });
}
