// React + Next Imports
import React from "react";
import { Suspense } from "react";

// NOTE: this page reads `searchParams` (search box), which forces dynamic
// rendering — `export const revalidate` would be a no-op. The DB layer is
// still cached via unstable_cache in lib/data.ts; per-request render is
// cheap because the heavy reads are tagged.

// Database Imports
import {
  getAllCategoriesTranslated,
  getFeaturedBookmarks,
  getLatestBookmarks,
  getBookmarksCount,
  searchBookmarks,
  getTranslationsForEntities,
  applyTranslations,
} from "@/lib/data";

// Component Imports
import { BookmarkCard } from "@/components/bookmark-card";
import { BookmarkGrid } from "@/components/bookmark-grid";
import { CategorySidebar } from "@/components/category-sidebar";
import { MobileCategoryRail } from "@/components/mobile-category-rail";
import { HomeDiscoveryHero } from "@/components/home-discovery-hero";
import { TopNav } from "@/components/top-nav";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

import Link from "next/link";
import { SafeExternalImage } from "@/components/safe-external-image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link as LocaleLink } from "@/i18n/navigation";
import { Metadata } from "next";
import { directory } from "@/directory.config";
import {
  JsonLd,
  generateWebSiteSchema,
  generateItemListSchema,
} from "@/components/json-ld";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: directory.title,
  description: directory.description,
  alternates: {
    canonical: "/",
  },
};

const HOME_CARD_LIMIT = 30;
const FEATURED_CARD_LIMIT = 4;

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string }>;
}) {
  const [{ locale }, resolvedSearchParams, t, tMobile] = await Promise.all([
    params,
    searchParams,
    getTranslations("home"),
    getTranslations("mobileDiscovery"),
  ]);
  // 如果有搜索参数，不加载 featured 和 latest
  const showDefaultView = !resolvedSearchParams.search;

  // Parallel data fetching with conditional logic. The raw arrays come from
  // unstable_cache and must never be mutated in place.
  const [
    categories,
    bookmarksCount,
    rawFeaturedTools,
    latestCandidates,
    rawSearchResults,
  ] = await Promise.all([
      getAllCategoriesTranslated(locale),
      getBookmarksCount(),
      showDefaultView
        ? getFeaturedBookmarks(FEATURED_CARD_LIMIT)
        : Promise.resolve([]),
      showDefaultView
        ? getLatestBookmarks(HOME_CARD_LIMIT + FEATURED_CARD_LIMIT)
        : Promise.resolve([]),
      resolvedSearchParams.search
        ? searchBookmarks(resolvedSearchParams.search)
        : Promise.resolve([]),
    ]);

  let featuredTools = rawFeaturedTools;
  let searchResults = rawSearchResults;

  // Featured entries also qualify for the latest query. Exclude them before
  // applying the homepage-wide limit so the default view always contains at
  // most 30 unique tool cards in total.
  const featuredIds = new Set(featuredTools.map((bookmark) => bookmark.id));
  let latestTools = latestCandidates
    .filter((bookmark) => !featuredIds.has(bookmark.id))
    .slice(0, Math.max(0, HOME_CARD_LIMIT - featuredTools.length));

  // Apply translations to bookmarks
  if (locale !== "en") {
    const allBookmarkIds = [
      ...featuredTools,
      ...latestTools,
      ...searchResults,
    ].map((b) => b.id);
    const tMap = await getTranslationsForEntities(
      "bookmark",
      allBookmarkIds,
      locale,
    );
    featuredTools = featuredTools.map((b) => applyTranslations(b, tMap));
    latestTools = latestTools.map((b) => applyTranslations(b, tMap));
    searchResults = searchResults.map((b) => applyTranslations(b, tMap));
  }

  const filteredBookmarks = searchResults;

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={generateWebSiteSchema()} />
      {showDefaultView && latestTools.length > 0 && (
        <JsonLd
          data={generateItemListSchema(
            "Latest Tools",
            "Discover the latest curated tools and SaaS products",
            "/",
            latestTools.map((t, i) => ({
              title: t.title,
              slug: t.slug,
              url: t.url,
              position: i + 1,
            })),
          )}
        />
      )}
      <TopNav />
      <div className="mx-auto flex max-w-[1800px]">
        {/* Left Sidebar */}
        <Suspense
          fallback={
            <div className="hidden w-56 border-r pr-6 lg:block">Loading...</div>
          }
        >
          <CategorySidebar
            categories={categories.map((cat) => ({
              id: cat.id.toString(),
              name: cat.name,
              slug: cat.slug,
              color: cat.color || undefined,
              icon: cat.icon || undefined,
              groupKey: cat.groupKey,
            }))}
          />
        </Suspense>

        {/* Main Content */}
        <main className="w-full max-w-full flex-1 overflow-x-hidden lg:w-auto">
          <div className="px-4 py-5 sm:py-8 lg:px-8">
            {showDefaultView ? (
              <HomeDiscoveryHero
                headline={t("headline")}
                subheadline={t("subheadline", { count: bookmarksCount })}
                exploreCta={t("exploreCta")}
              />
            ) : null}

            {showDefaultView ? (
              <MobileCategoryRail
                allCategoriesLabel={tMobile("allCategories")}
                categories={categories.map((category) => ({
                  id: category.id.toString(),
                  name: category.name,
                  slug: category.slug,
                }))}
                label={tMobile("categoryTrail")}
              />
            ) : null}

            {/* 显示默认视图（Featured + Latest + CTA） */}
            {showDefaultView ? (
              <>
                {/* Featured Tools Section */}
                {featuredTools.length > 0 && (
                  <section className="mb-12 sm:mb-20">
                    <div className="mb-5 flex items-center justify-between gap-4 sm:mb-7">
                      <h2 className="text-2xl font-bold tracking-[-0.035em] sm:text-3xl">
                        {t("featured")}
                      </h2>
                      <LocaleLink
                        href="/c"
                        className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary sm:text-base"
                      >
                        {t("viewAll")}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </LocaleLink>
                    </div>
                    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:gap-5 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
                      {featuredTools.map((tool) => (
                        <LocaleLink
                          key={tool.id}
                          href={`/${tool.slug}`}
                          className="group block w-[82vw] shrink-0 snap-start md:w-auto"
                        >
                          <article className="relative h-full overflow-hidden rounded-2xl border border-slate-200/85 bg-card transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_38px_rgba(30,57,101,0.12)] dark:border-border">
                            {/* Cover Image */}
                            <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                              {tool.ogImage ? (
                                <SafeExternalImage
                                  src={tool.ogImage}
                                  alt={tool.title}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.9),transparent_33%),linear-gradient(135deg,#e5edff,#eff7ff)]">
                                  <span className="text-4xl font-bold text-slate-400/50">
                                    {tool.title.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            {/* Title */}
                            <div className="flex min-h-40 flex-col p-4 sm:p-5">
                              <h3 className="line-clamp-1 text-base font-semibold tracking-[-0.02em] transition-colors group-hover:text-primary sm:text-lg">
                                {tool.title}
                              </h3>
                              {tool.description && (
                                <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-muted-foreground">
                                  {tool.description}
                                </p>
                              )}
                              {tool.category ? (
                                <span className="mt-auto w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-muted dark:text-muted-foreground">
                                  {tool.category.name}
                                </span>
                              ) : null}
                            </div>
                          </article>
                        </LocaleLink>
                      ))}
                    </div>
                  </section>
                )}

                {/* Latest Tools Section */}
                <div className="mb-10 sm:mb-16">
                  <h2 className="mb-5 text-2xl font-bold tracking-tight sm:mb-8 sm:text-center sm:text-3xl">
                    {t("latest")}
                  </h2>
                  <BookmarkGrid>
                    {latestTools.map((bookmark) => (
                      <BookmarkCard
                        key={bookmark.id}
                        bookmark={{
                          id: bookmark.id,
                          url: bookmark.url,
                          title: bookmark.title,
                          description: bookmark.description,
                          category: bookmark.category
                            ? {
                                id: bookmark.category.id.toString(),
                                name: bookmark.category.name,
                                slug: bookmark.category.slug,
                                color: bookmark.category.color || undefined,
                                icon: bookmark.category.icon || undefined,
                              }
                            : undefined,
                          favicon: bookmark.favicon,
                          overview: bookmark.overview,
                          ogImage: bookmark.ogImage,
                          isArchived: bookmark.isArchived,
                          isFavorite: bookmark.isFavorite,
                          isDofollow: bookmark.isDofollow,

                          slug: bookmark.slug,
                        }}
                      />
                    ))}
                  </BookmarkGrid>
                </div>

                {/* Linux Alliance & Recommended Projects */}
                <div className="mb-10 sm:mb-16">
                  <h2 className="mb-5 text-2xl font-bold tracking-tight sm:mb-8 sm:text-center sm:text-3xl">
                    {t("allianceTitle")}
                  </h2>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2 rounded-xl border bg-card p-5">
                      <h3 className="text-lg font-semibold">
                        {t("allianceLinuxTitle")}
                      </h3>
                      <p className="mb-3 text-sm text-muted-foreground">
                        {t("allianceLinuxDesc")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href="https://debian.club/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Debian.Club
                        </a>
                        <span className="text-muted-foreground">|</span>
                        <a
                          href="https://ubuntu.fan/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Ubuntu.Fan
                        </a>
                        <span className="text-muted-foreground">|</span>
                        <a
                          href="https://runentlinux.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          RunEntLinux
                        </a>
                        <span className="text-muted-foreground">|</span>
                        <a
                          href="https://www.almalinux.com.cn/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          AlmaLinuxCN
                        </a>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-xl border bg-card p-5">
                      <h3 className="text-lg font-semibold">
                        {t("allianceEolTitle")}
                      </h3>
                      <p className="mb-3 text-sm text-muted-foreground">
                        {t("allianceEolDesc")}
                      </p>
                      <a
                        href="https://eol.wiki/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        EOL.Wiki
                      </a>
                    </div>

                    <div className="space-y-2 rounded-xl border bg-card p-5">
                      <h3 className="text-lg font-semibold">
                        {t("alliancePanelTitle")}
                      </h3>
                      <p className="mb-3 text-sm text-muted-foreground">
                        {t("alliancePanelDesc")}
                      </p>
                      <a
                        href="https://web.casa"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        WebCasa
                      </a>
                    </div>

                    <div className="space-y-2 rounded-xl border bg-card p-5">
                      <h3 className="text-lg font-semibold">
                        {t("allianceHttpdTitle")}
                      </h3>
                      <p className="mb-3 text-sm text-muted-foreground">
                        {t("allianceHttpdDesc")}
                      </p>
                      <a
                        href="https://litehttpd.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        LiteHTTPD
                      </a>
                    </div>
                  </div>
                </div>

                {/* How to Get Dofollow Links CTA */}
                <Card className="mb-8 border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-center text-2xl">
                      {t("dofollowTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center text-lg text-muted-foreground">
                      {t("dofollowSubtitle")}
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="space-y-3 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-2xl font-bold text-primary">
                            1
                          </span>
                        </div>
                        <h3 className="font-semibold">{t("step1Title")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("step1Desc")}
                        </p>
                      </div>

                      <div className="space-y-3 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-2xl font-bold text-primary">
                            2
                          </span>
                        </div>
                        <h3 className="font-semibold">{t("step2Title")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("step2Desc")}
                        </p>
                      </div>

                      <div className="space-y-3 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-2xl font-bold text-primary">
                            3
                          </span>
                        </div>
                        <h3 className="font-semibold">{t("step3Title")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("step3Desc")}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 text-center">
                      <Link href="/legal/badges">
                        <Button size="lg" className="gap-2">
                          {t("viewBadgeOptions")}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* 搜索结果视图 */
              <>
                <BookmarkGrid>
                  {filteredBookmarks.map((bookmark) => (
                    <BookmarkCard
                      key={bookmark.id}
                      bookmark={{
                        id: bookmark.id,
                        url: bookmark.url,
                        title: bookmark.title,
                        description: bookmark.description,
                        category: bookmark.category
                          ? {
                              id: bookmark.category.id.toString(),
                              name: bookmark.category.name,
                              slug: bookmark.category.slug,
                              color: bookmark.category.color || undefined,
                              icon: bookmark.category.icon || undefined,
                            }
                          : undefined,
                        favicon: bookmark.favicon,
                        overview: bookmark.overview,
                        ogImage: bookmark.ogImage,
                        isArchived: bookmark.isArchived,
                        isFavorite: bookmark.isFavorite,
                        isDofollow: bookmark.isDofollow,

                        slug: bookmark.slug,
                      }}
                    />
                  ))}
                </BookmarkGrid>

                {filteredBookmarks.length === 0 && (
                  <div className="py-16 text-center">
                    <p className="text-muted-foreground">
                      {t("noResults")}
                      {resolvedSearchParams.search &&
                        ` matching "${resolvedSearchParams.search}"`}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
