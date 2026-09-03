/**
 * Badge verification utility
 * Checks if a website contains the HiCyou badge
 */

import { load } from "cheerio";

import { safeFetchHtml } from "@/lib/fetch-metadata";
import { parseHttpUrl } from "@/lib/url-validator";

const BADGE_PATHS = ["/badge/featured-light.svg", "/badge/featured-dark.svg"];

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hicyou.com";

function normalizedHostname(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

/**
 * Require the badge image to be inside the backlink. Parsing the markup avoids
 * dynamic regular expressions and prevents an unrelated image and link from
 * satisfying two independent substring checks.
 */
export function containsLinkedBadge(
  html: string,
  pageUrl: URL,
  siteUrl = new URL(SITE_URL),
): boolean {
  const $ = load(html);
  const expectedHostname = normalizedHostname(siteUrl);

  return $("a[href]")
    .toArray()
    .some((anchor) => {
      let href: URL;
      try {
        href = new URL($(anchor).attr("href")!, pageUrl);
      } catch {
        return false;
      }
      if (
        href.protocol !== siteUrl.protocol ||
        normalizedHostname(href) !== expectedHostname ||
        href.port !== siteUrl.port
      ) {
        return false;
      }

      return $(anchor)
        .find("img[src]")
        .toArray()
        .some((image) => {
          try {
            const source = new URL($(image).attr("src")!, pageUrl);
            return BADGE_PATHS.includes(source.pathname);
          } catch {
            return false;
          }
        });
    });
}

/**
 * Verify if a website contains our badge
 * @param targetUrl The URL to check
 * @returns true if badge is found, false otherwise
 */
export async function verifyBadge(targetUrl: string): Promise<boolean> {
  try {
    // safeFetchHtml enforces manual redirects (re-validated each hop),
    // 10s timeout, and a 2MB response cap.
    const { url, html } = await safeFetchHtml(parseHttpUrl(targetUrl));
    return containsLinkedBadge(html, url);
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
