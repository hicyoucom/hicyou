/**
 * Badge verification utility
 * Checks if a website contains the Hi Cyou badge
 */

const BADGE_PATHS = [
  "/badge/featured-light.svg",
  "/badge/featured-dark.svg",
];

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hicyou.com";

/**
 * Verify if a website contains our badge
 * @param targetUrl The URL to check
 * @returns true if badge is found, false otherwise
 */
export async function verifyBadge(targetUrl: string): Promise<boolean> {
  try {
    // Normalize URL
    const url = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;

    // Fetch the HTML content with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "HiCyou Badge Verifier/1.0",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`Failed to fetch ${url}: ${response.status}`);
      return false;
    }

    const html = await response.text();
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
      console.log(`Badge image not found in ${url}`);
      return false;
    }

    // Also check if the badge links back to our site
    const siteUrlLower = SITE_URL.toLowerCase();
    const hasSiteLink = (
      htmlLower.includes(`href="${siteUrlLower}"`) ||
      htmlLower.includes(`href='${siteUrlLower}'`) ||
      htmlLower.includes(`href=${siteUrlLower}`)
    );

    if (!hasSiteLink) {
      console.log(`Site link not found in ${url}`);
      return false;
    }

    console.log(`✓ Badge verified on ${url}`);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.log(`Timeout verifying badge on ${targetUrl}`);
      } else {
        console.log(`Error verifying badge on ${targetUrl}:`, error.message);
      }
    }
    return false;
  }
}

/**
 * Batch verify badges for multiple URLs
 */
export async function batchVerifyBadges(urls: string[]): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  for (const url of urls) {
    const verified = await verifyBadge(url);
    results.set(url, verified);
    // Add a small delay between requests to be nice
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

