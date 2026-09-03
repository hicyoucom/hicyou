
/**
 * Validate a stored external URL at the rendering boundary. Older or imported
 * rows may predate current write-side validation, so callers must not render a
 * non-web scheme as a clickable link.
 */
export function getSafeExternalHref(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Get the appropriate link for a bookmark based on its dofollow status.
 * Invalid legacy values fail closed to a same-page fragment.
 */
export function getBookmarkLink(
  url: string,
  isDofollow: boolean = false,
): string {
  const safeHref = getSafeExternalHref(url);
  if (!safeHref) return "#";
  if (!isDofollow) return safeHref;

  const parsed = new URL(safeHref);
  parsed.searchParams.set("utm_source", "hicyou.com");
  return parsed.toString();
}

/**
 * Get the rel attribute for a bookmark link
 * @param isDofollow - Whether the bookmark has dofollow enabled
 * @returns The appropriate rel attribute value
 */
export function getBookmarkRel(isDofollow: boolean = false): string {
  // Dofollow = clean follow link (no nofollow/ugc/sponsored) so it passes link
  // equity; nofollow stays in the nofollow family.
  return isDofollow ? "noopener noreferrer" : "noopener noreferrer nofollow";
}
