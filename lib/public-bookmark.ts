import { bookmarks } from "@/db/schema";
import { and, eq, isNull, type SQL } from "drizzle-orm";

/**
 * The lifecycle boundary for records that may be rendered on the public
 * directory or emitted by the public API. A row being present in the table is
 * not enough to make it a public listing.
 */
export function publicBookmarkCondition(): SQL {
  return and(
    eq(bookmarks.status, "published"),
    eq(bookmarks.isArchived, false),
    isNull(bookmarks.deletedAt),
  )!;
}
