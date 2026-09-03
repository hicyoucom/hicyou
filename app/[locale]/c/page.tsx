// React + Next Imports
import React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { Metadata } from "next";

// Database Imports
import {
  getAllCategoriesTranslated,
  getCategoryBookmarkCounts,
  getBookmarksCount,
} from "@/lib/data";

// Docker/Zeabur builds intentionally have no database secret. Render this
// database-backed entry point at runtime; its data helpers remain cached.
export const dynamic = "force-dynamic";

// Component Imports
import { CategorySidebar } from "@/components/category-sidebar";
import { TopNav } from "@/components/top-nav";
import { DynamicIcon } from "@/lib/icon-utils";
import { Badge } from "@/components/ui/badge";
import { Grid3x3, Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "All Categories | Directory",
  description:
    "Browse all tool categories and find the one that fits your needs",
};

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("allCategories");
  const [categories, categoryCountMap, totalBookmarks] = await Promise.all([
    getAllCategoriesTranslated(locale),
    getCategoryBookmarkCounts(),
    getBookmarksCount(),
  ]);

  return (
    <div className="min-h-screen bg-background">
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
          <div className="px-4 py-8 lg:px-8">
            {/* Hero Section */}
            <div className="relative mb-12 overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-primary/5 py-4 text-center md:py-5">
              {/* Background Effects */}
              <div className="bg-grid-white/5 absolute inset-0 [mask-image:radial-gradient(white,transparent_85%)]"></div>
              <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>
              <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-primary/20 blur-3xl"></div>

              {/* Content */}
              <div className="relative z-10 px-4">
                {/* Icon Badge */}
                <div className="mb-3 flex items-center justify-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shadow-lg">
                    <Grid3x3 className="h-6 w-6 text-primary" />
                  </div>
                </div>

                {/* Title */}
                <h1 className="mb-2 text-balance text-3xl font-bold leading-tight tracking-tight md:text-4xl">
                  {t("title")}
                </h1>

                {/* Description */}
                <p className="mx-auto mb-4 max-w-3xl text-balance text-sm text-muted-foreground md:text-base">
                  {t("description")}
                </p>

                {/* Stats Badges */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Badge
                    variant="secondary"
                    className="rounded-full px-3 py-1 text-xs font-medium"
                  >
                    <Layers className="mr-1.5 h-3 w-3" />
                    {categories.length} {t("statsCategories")}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {totalBookmarks} {t("totalTools")}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const bookmarkCount = categoryCountMap[category.id] || 0;

                return (
                  <Link
                    key={category.id}
                    href={`/c/${category.slug}`}
                    className="group relative flex flex-col gap-3 overflow-hidden rounded-lg border bg-card p-6 transition-all duration-200 hover:border-primary/50 hover:shadow-md"
                  >
                    {/* Icon and Title */}
                    <div className="flex items-start gap-3">
                      {category.icon ? (
                        <div
                          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border"
                          style={
                            category.color
                              ? {
                                  backgroundColor: `${category.color}15`,
                                  borderColor: `${category.color}50`,
                                }
                              : undefined
                          }
                        >
                          <DynamicIcon
                            name={category.icon}
                            className="h-6 w-6"
                            style={
                              category.color
                                ? { color: category.color }
                                : undefined
                            }
                            aria-label={category.name}
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-muted">
                          <span className="text-lg font-semibold text-muted-foreground">
                            {category.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 line-clamp-1 text-lg font-semibold transition-colors group-hover:text-primary">
                          {category.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {bookmarkCount} {t("toolPlural")}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {category.description && (
                      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {category.description}
                      </p>
                    )}

                    {/* Hover Arrow */}
                    <div className="absolute bottom-4 right-4 opacity-0 transition-opacity group-hover:opacity-100">
                      <svg
                        className="h-5 w-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Empty State */}
            {categories.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">{t("empty")}</p>
              </div>
            )}

            {/* Stats Section */}
            <div className="mt-12 rounded-lg border bg-card p-6">
              <div className="grid grid-cols-1 gap-6 text-center sm:grid-cols-3">
                <div>
                  <div className="mb-1 text-3xl font-bold text-primary">
                    {categories.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("statsCategories")}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-3xl font-bold text-primary">
                    {totalBookmarks}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("statsTools")}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-3xl font-bold text-primary">
                    {totalBookmarks > 0
                      ? Math.round(totalBookmarks / categories.length)
                      : 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("statsAverage")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
