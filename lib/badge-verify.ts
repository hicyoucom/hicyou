/**
 * Badge verification utility
 * Checks if a website contains the Hi Cyou badge
 */

import { parseHttpUrl } from "@/lib/url-validator";
import { safeFetchHtml } from "@/lib/fetch-metadata";

const BADGE_PATHS = ["/badge/featured-light.svg", "/badge/featured-dark.svg"];

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hicyou.com";

/**
 * Verify if a website contains our badge
 * @param targetUrl The URL to check
 * @returns true if badge is found, false otherwise
 */
export async function verifyBadge(targetUrl: string): Promise<boolean> {
  try {
    // safeFetchHtml enforces manual redirects (re-validated each hop),
    // 10s timeout, and a 2MB response cap.
    const { html } = await safeFetchHtml(parseHttpUrl(targetUrl));
    const htmlLower = html.toLowerCase();

    // Check for badge image references
    const hasBadgeImage = BADGE_PATHS.some((path) => {
      const imagePath = path.toLowerCase();
      // Check various possible patterns
      return (
        htmlLower.includes(imagePath) ||
        htmlLower.includes(`src="${imagePath}"`) ||
        htmlLower.includes(`src='${imagePath}'`) ||
        htmlLower.includes(`src=${imagePath}`)
      );
    });

    if (!hasBadgeImage) {
      return false;
    }

    // Also check if the badge links back to our site
    // Allow SITE_URL and any subpaths
    const siteUrlObj = new URL(SITE_URL);
    const hostname = siteUrlObj.hostname.replace(/^www\./, "");
    // Escape dots for regex
    const escapedHostname = hostname.replace(/\./g, "\\.");

    // Pattern matches: https://(www.)?hostname(/.*)?
    const siteLinkPattern = new RegExp(
      `href=["']https:\\/\\/(www\\.)?${escapedHostname}(\\/.*)?["']`,
      "i",
    );
    const hasSiteLink = siteLinkPattern.test(html);

    if (!hasSiteLink) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Batch verify badges for multiple URLs
 */
export async function batchVerifyBadges(
  urls: string[],
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  for (const url of urls) {
    const verified = await verifyBadge(url);
    results.set(url, verified);
    // Add a small delay between requests to be nice
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}
