/**
 * 反向链接验证工具
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hicyou.com";
const REQUIRED_BACKLINK = SITE_URL;

/**
 * 验证URL是否包含反向链接
 * @param url 要检查的网站URL
 * @returns 是否包含反向链接
 */
export async function verifyBacklink(url: string): Promise<boolean> {
  try {
    // 规范化URL
    const targetUrl = url.startsWith("http") ? url : `https://${url}`;

    // 获取网页内容
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BacklinkBot/1.0)",
      },
      // 超时设置
      signal: AbortSignal.timeout(10000), // 10秒超时
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${targetUrl}: ${response.status}`);
      return false;
    }

    const html = await response.text();

    // 检查HTML中是否包含反向链接
    // 支持多种格式：
    // 1. <a href="https://qoo.im">
    // 2. <a href='https://qoo.im'>
    // 3. <link href="https://qoo.im">
    const siteUrlObj = new URL(SITE_URL);
    const hostname = siteUrlObj.hostname.replace(/^www\./, '');
    const escapedHostname = hostname.replace(/\./g, '\\.');

    const patterns = [
      // Flexible match for SITE_URL, www.SITE_URL, and subpaths
      new RegExp(`href=["']https:\\/\\/(www\\.)?${escapedHostname}(\\/.*)?["']`, 'i'),
      // Fallback to strict match if needed (though the above covers it)
      new RegExp(`href=["']${REQUIRED_BACKLINK}["']`, "i"),
      new RegExp(`href=["']${REQUIRED_BACKLINK}/["']`, "i"),
    ];

    const hasBacklink = patterns.some((pattern) => pattern.test(html));

    if (hasBacklink) {
      console.log(`✓ Backlink found on ${targetUrl}`);
    } else {
      console.log(`✗ No backlink found on ${targetUrl}`);
    }

    return hasBacklink;
  } catch (error) {
    console.error(`Error verifying backlink for ${url}:`, error);
    return false;
  }
}

/**
 * 批量验证多个URL的反向链接
 * @param urls URL数组
 * @returns 验证结果数组
 */
export async function verifyBacklinks(
  urls: string[]
): Promise<Array<{ url: string; verified: boolean }>> {
  const results = await Promise.allSettled(
    urls.map(async (url) => ({
      url,
      verified: await verifyBacklink(url),
    }))
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return { url: urls[index], verified: false };
  });
}


