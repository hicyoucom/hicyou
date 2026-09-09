import { expect, test } from "bun:test";
import { escapeXml, parseSitemapBucket, sitemapXml } from "@/lib/sitemap";

test("sitemap bucket validation rejects unbounded or malformed ranges", () => {
  expect(parseSitemapBucket("bookmark-2.xml")).toEqual({
    kind: "bookmark",
    index: 2,
  });
  for (const value of [
    "bookmark--1.xml",
    "bookmark-01.xml",
    "bookmark-9999999999.xml",
    "../bookmarks",
    "unknown-0.xml",
  ]) {
    expect(parseSitemapBucket(value)).toBeNull();
  }
});
test("XML escapes URLs and does not invent last modification times", () => {
  expect(escapeXml('a<&"')).toBe("a&lt;&amp;&quot;");
  const xml = sitemapXml([{ path: "/a&b" }]);
  expect(xml).toContain("/a&amp;b</loc>");
  expect(xml).not.toContain("<lastmod>");
  expect(xml.match(/hreflang=/g)?.length).toBe(8);
});
