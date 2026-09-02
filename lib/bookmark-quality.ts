/**
 * The editorial baseline used by the admin quality console. These signals are
 * deliberately internal and deterministic: they describe stored directory
 * data, not the health or ownership of a publisher's external website.
 */
export const BOOKMARK_QUALITY_RULES = [
  { key: "category", label: "Category" },
  { key: "description", label: "Short description" },
  { key: "overview", label: "Overview" },
  { key: "favicon", label: "Favicon" },
  { key: "ogImage", label: "Cover image" },
  { key: "keyFeatures", label: "Key features" },
  { key: "useCases", label: "Use cases" },
] as const;

export type BookmarkQualityIssue =
  (typeof BOOKMARK_QUALITY_RULES)[number]["key"];

export type BookmarkQualityInput = {
  categoryId: number | null;
  description: string | null;
  overview: string | null;
  favicon: string | null;
  ogImage: string | null;
  keyFeatures: unknown;
  useCases: unknown;
};

export const BOOKMARK_QUALITY_LABELS: Record<BookmarkQualityIssue, string> =
  Object.fromEntries(
    BOOKMARK_QUALITY_RULES.map((rule) => [rule.key, rule.label]),
  ) as Record<BookmarkQualityIssue, string>;

function isBlankText(value: string | null): boolean {
  return value === null || value.trim().length === 0;
}

function isEmptyArray(value: unknown): boolean {
  return !Array.isArray(value) || value.length === 0;
}

/**
 * Returns only the editorial fields that require an admin's attention. A
 * truthy but non-array JSON value is treated as absent so legacy malformed
 * content is not silently counted as complete.
 */
export function getBookmarkQualityIssues(
  bookmark: BookmarkQualityInput,
): BookmarkQualityIssue[] {
  const issues: BookmarkQualityIssue[] = [];

  if (bookmark.categoryId === null) issues.push("category");
  if (isBlankText(bookmark.description)) issues.push("description");
  if (isBlankText(bookmark.overview)) issues.push("overview");
  if (isBlankText(bookmark.favicon)) issues.push("favicon");
  if (isBlankText(bookmark.ogImage)) issues.push("ogImage");
  if (isEmptyArray(bookmark.keyFeatures)) issues.push("keyFeatures");
  if (isEmptyArray(bookmark.useCases)) issues.push("useCases");

  return issues;
}

/**
 * The score is a transparent percentage of the baseline fields present; it
 * is never persisted, so editing a listing immediately changes its result.
 */
export function getBookmarkQualityScore(
  issues: readonly BookmarkQualityIssue[],
): number {
  const uniqueIssues = new Set(issues);
  const completeFields = Math.max(
    0,
    BOOKMARK_QUALITY_RULES.length - uniqueIssues.size,
  );

  return Math.round((completeFields / BOOKMARK_QUALITY_RULES.length) * 100);
}

export function getBookmarkQualityCoverage(
  total: number,
  missingFields: number,
): number | null {
  if (!Number.isFinite(total) || total <= 0) return null;

  const possibleFields = total * BOOKMARK_QUALITY_RULES.length;
  const completeFields = Math.max(
    0,
    possibleFields - Math.max(0, missingFields),
  );

  return completeFields / possibleFields;
}
