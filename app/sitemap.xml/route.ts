import { directory } from "@/directory.config";
import { escapeXml, getSitemapBuckets } from "@/lib/sitemap";
export const revalidate = 3600;
// Build images before their deployment DB exists. Cache the small index data
// at runtime, never a build-time response containing only static links.
export const dynamic = "force-dynamic";
export async function GET() {
  const buckets = await getSitemapBuckets();
  const body =
    '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    buckets
      .map(
        (bucket) =>
          `<sitemap><loc>${escapeXml(directory.baseUrl + "/sitemaps/" + bucket + ".xml")}</loc></sitemap>`,
      )
      .join("") +
    "</sitemapindex>";
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
