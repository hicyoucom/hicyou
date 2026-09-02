import { db } from "@/db/client";
import { bookmarks, submissions } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export type SubmissionUrlAvailability =
  | "available"
  | "already_submitted"
  | "already_listed";

function legacyRootSlashVariant(normalizedUrl: string): string | null {
  const url = new URL(normalizedUrl);
  return url.pathname === "/" && !url.search ? `${normalizedUrl}/` : null;
}

/**
 * Reports only whether a canonical URL can begin a new submission. It does
 * not expose records or IDs to the caller.
 */
export async function getSubmissionUrlAvailability(
  normalizedUrl: string,
): Promise<SubmissionUrlAvailability> {
  // Entries created before URL-first normalization can retain the root slash.
  // Keep those records protected without making all URL comparisons fuzzy.
  const legacyVariant = legacyRootSlashVariant(normalizedUrl);
  const submissionUrlCondition = legacyVariant
    ? or(eq(submissions.url, normalizedUrl), eq(submissions.url, legacyVariant))
    : eq(submissions.url, normalizedUrl);
  const bookmarkUrlCondition = legacyVariant
    ? or(eq(bookmarks.url, normalizedUrl), eq(bookmarks.url, legacyVariant))
    : eq(bookmarks.url, normalizedUrl);

  const [existingSubmissions, existingBookmarks] = await Promise.all([
    db
      .select({ id: submissions.id })
      .from(submissions)
      .where(submissionUrlCondition)
      .limit(1),
    db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(bookmarkUrlCondition)
      .limit(1),
  ]);

  if (existingBookmarks.length > 0) {
    return "already_listed";
  }

  return existingSubmissions.length > 0 ? "already_submitted" : "available";
}
