/**
 * Accept only same-origin absolute paths or credential-free HTTPS URLs for
 * browser-rendered bookmark media. Invalid sources fall back to local UI.
 */
export function normalizePublicImageSource(src?: string | null) {
  if (!src) return null;

  if (src.startsWith("/") && !src.startsWith("//") && !src.includes("\\")) {
    return src;
  }

  try {
    const url = new URL(src);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
