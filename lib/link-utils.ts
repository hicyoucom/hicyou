import { directory } from "@/directory.config";

/**
 * Get the appropriate link for a bookmark based on its dofollow status
 * @param url - The original bookmark URL
 * @param isDofollow - Whether the bookmark has dofollow enabled
 * @returns The final URL to use (either direct or via /go redirect)
 */
export function getBookmarkLink(url: string, isDofollow: boolean = false): string {
  if (isDofollow) {
    // Direct link for dofollow bookmarks - add UTM parameter
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}utm_source=hicyou.com`;
  } else {
    // Redirect through /go for nofollow bookmarks
    const encodedUrl = encodeURIComponent(url);
    return `/go/${encodedUrl}`;
  }
}

/**
 * Get the rel attribute for a bookmark link
 * @param isDofollow - Whether the bookmark has dofollow enabled
 * @returns The appropriate rel attribute value
 */
export function getBookmarkRel(isDofollow: boolean = false): string {
  return isDofollow ? "noopener noreferrer ugc" : "noopener noreferrer nofollow";
}

