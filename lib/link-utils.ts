
/**
 * Get the appropriate link for a bookmark based on its dofollow status
 * @param url - The original bookmark URL
 * @param isDofollow - Whether the bookmark has dofollow enabled
 * @returns The external URL. Nofollow behavior is expressed by the rel
 * attribute, so no arbitrary-destination redirect endpoint is required.
 */
export function getBookmarkLink(url: string, isDofollow: boolean = false): string {
  if (isDofollow) {
    // Direct link for dofollow bookmarks - add UTM parameter
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}utm_source=hicyou.com`;
  }
  return url;
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
