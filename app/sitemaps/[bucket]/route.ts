import {
  getSitemapEntries,
  parseSitemapBucket,
  sitemapXml,
  staticSitemapEntries,
} from "@/lib/sitemap";
export const revalidate = 3600;
export const dynamic = "force-static";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bucket: string }> },
) {
  const { bucket } = await params;
  const parsed = parseSitemapBucket(bucket);
  if (bucket !== "static-0.xml" && !parsed)
    return new Response("Not found", { status: 404 });
  const entries = parsed
    ? await getSitemapEntries(parsed.kind, parsed.index)
    : staticSitemapEntries;
  if (!entries.length) return new Response("Not found", { status: 404 });
  return new Response(sitemapXml(entries), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
