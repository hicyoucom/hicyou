import { sql } from "drizzle-orm";
import * as nextCache from "next/cache";
import { db } from "@/db/client";
import { directory } from "@/directory.config";
import { defaultLocale, locales } from "@/i18n/config";
import {
  CACHE_TAGS,
  SITEMAP_BUCKET_SIZE,
  sitemapBucketTag,
} from "@/lib/cache-tags";

const kinds = ["bookmark", "category", "tag", "collection"] as const;
type Kind = (typeof kinds)[number];
const sources = {
  bookmark: {
    table: "bookmarks",
    prefix: "/",
    condition:
      "status = 'published' and is_archived = false and deleted_at is null",
  },
  category: {
    table: "categories",
    prefix: "/c/",
    condition: "status = 'active'",
  },
  tag: { table: "tags", prefix: "/tags/", condition: "true" },
  collection: {
    table: "collections",
    prefix: "/collections/",
    condition: "status = 'published'",
  },
} as const;
export function escapeXml(value: string): string {
  return value.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}
export const getSitemapBuckets = nextCache.unstable_cache(
  async () => {
    if (!process.env.DATABASE_URL) return ["static-0"];
    const buckets = ["static-0"];
    for (const kind of kinds) {
      const source = sources[kind];
      // Use occupied ID ranges so deleted rows and sequence gaps do not create
      // thousands of empty sitemap URLs. This scan reads IDs, never long text.
      const rows = await db.execute<{ bucket: number }>(
        sql.raw(
          `select distinct (id / ${SITEMAP_BUCKET_SIZE}) as bucket from ${source.table} where ${source.condition} and id >= 0 order by bucket`,
        ),
      );
      for (const row of rows) buckets.push(`${kind}-${row.bucket}`);
    }
    return buckets;
  },
  ["sitemap:buckets:v1"],
  {
    revalidate: 3600,
    tags: [
      CACHE_TAGS.bookmarks,
      CACHE_TAGS.sitemapIndex,
      CACHE_TAGS.categories,
      CACHE_TAGS.tags,
      CACHE_TAGS.collections,
    ],
  },
);

export function parseSitemapBucket(
  bucket: string,
): { kind: Kind; index: number } | null {
  const match = /^(bookmark|category|tag|collection)-(0|[1-9]\d*)\.xml$/.exec(
    bucket,
  );
  if (!match) return null;
  const index = Number(match[2]);
  if (
    !Number.isSafeInteger(index) ||
    index > Math.floor(2147483647 / SITEMAP_BUCKET_SIZE)
  )
    return null;
  return { kind: match[1] as Kind, index };
}
export async function getSitemapEntries(kind: Kind, index: number) {
  const source = sources[kind];
  return nextCache.unstable_cache(
    async () => {
      if (!process.env.DATABASE_URL) return [];
      const rows = await db.execute<{
        slug: string;
        updated_at: string | Date | null;
      }>(sql`
      select slug, updated_at from ${sql.raw(source.table)}
      where ${sql.raw(source.condition)} and id >= ${index * SITEMAP_BUCKET_SIZE}
        and id < ${(index + 1) * SITEMAP_BUCKET_SIZE} order by id limit ${SITEMAP_BUCKET_SIZE}`);
      return rows.map((row) => ({
        path: source.prefix + encodeURIComponent(row.slug),
        lastModified: row.updated_at
          ? new Date(row.updated_at).toISOString()
          : undefined,
      }));
    },
    ["sitemap:entries:v1", kind, String(index)],
    {
      revalidate: 3600,
      tags:
        kind === "bookmark"
          ? [
              CACHE_TAGS.bookmarks,
              sitemapBucketTag(index * SITEMAP_BUCKET_SIZE),
            ]
          : [CACHE_TAGS.categories, CACHE_TAGS.tags, CACHE_TAGS.collections],
    },
  )();
}
export const staticSitemapEntries = [
  "/",
  "/c",
  "/tags",
  "/collections",
  "/about",
  "/submit",
  "/legal",
  "/legal/terms",
  "/legal/privacy",
  "/legal/badges",
].map((path) => ({ path, lastModified: undefined }));

export function sitemapXml(entries: { path: string; lastModified?: string }[]) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
    entries
      .map((entry) => {
        const url = directory.baseUrl + (entry.path === "/" ? "" : entry.path);
        const alternates = [...locales, "x-default"]
          .map((locale) => {
            const prefix =
              locale === defaultLocale || locale === "x-default"
                ? ""
                : `/${locale}`;
            return `<xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(directory.baseUrl + prefix + (entry.path === "/" ? "" : entry.path))}"/>`;
          })
          .join("");
        return `<url><loc>${escapeXml(url)}</loc>${entry.lastModified ? `<lastmod>${escapeXml(entry.lastModified)}</lastmod>` : ""}${alternates}</url>`;
      })
      .join("") +
    "</urlset>"
  );
}
