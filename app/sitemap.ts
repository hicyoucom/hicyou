import type { MetadataRoute } from "next";

import { directory } from "@/directory.config";
import { defaultLocale, locales } from "@/i18n/config";
import {
  getAllCategories,
  getAllCollections,
  getPublicBookmarkSitemapEntries,
  getTagsWithCount,
} from "@/lib/data";

export const dynamic = "force-dynamic";

function alternates(route: string) {
  const languages = Object.fromEntries(
    locales.map((locale) => [
      locale,
      `${directory.baseUrl}${locale === defaultLocale ? "" : `/${locale}`}${route}`,
    ]),
  );
  languages["x-default"] = `${directory.baseUrl}${route}`;
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [bookmarks, categories, tags, collections] = await Promise.all([
    getPublicBookmarkSitemapEntries(),
    getAllCategories(),
    getTagsWithCount(),
    getAllCollections(false),
  ]);
  const staticRoutes = [
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
  ];
  return [
    ...staticRoutes.map((route) => ({
      url: `${directory.baseUrl}${route === "/" ? "" : route}`,
      lastModified: new Date(),
      alternates: alternates(route),
    })),
    ...categories.map((item) => ({
      url: `${directory.baseUrl}/c/${item.slug}`,
      lastModified: new Date(),
      alternates: alternates(`/c/${item.slug}`),
    })),
    ...tags.map((item) => ({
      url: `${directory.baseUrl}/tags/${item.slug}`,
      lastModified: new Date(),
      alternates: alternates(`/tags/${item.slug}`),
    })),
    ...collections.map((item) => ({
      url: `${directory.baseUrl}/collections/${item.slug}`,
      lastModified: new Date(),
      alternates: alternates(`/collections/${item.slug}`),
    })),
    ...bookmarks.map((item) => ({
      url: `${directory.baseUrl}/${item.slug}`,
      lastModified: item.updatedAt,
      alternates: alternates(`/${item.slug}`),
    })),
  ];
}
