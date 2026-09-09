// React + Next Imports
import React from "react";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

// Database Imports
import {
  getBookmarksByCategory,
  getAllCategoriesTranslated,
  getCategoryBySlug,
  getCategoryBySlugTranslated,
  getTranslationsForEntities,
  applyTranslations,
} from "@/lib/data";

// Component Imports
import { BookmarkCard } from "@/components/bookmark-card";
import { BookmarkGrid } from "@/components/bookmark-grid";
import { CategorySidebar } from "@/components/category-sidebar";
import { CategoryPagination } from "@/components/category-pagination";
import { TopNav } from "@/components/top-nav";
import { Badge } from "@/components/ui/badge";
import { DynamicIcon } from "@/lib/icon-utils";
import {
  JsonLd,
  generateItemListSchema,
  generateBreadcrumbSchema,
} from "@/components/json-ld";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Category Not Found",
    };
  }

  return {
    title: `${category.name} | HiCyou - Free Open Source Directory`,
    description:
      category.description ||
      `Discover the best ${category.name} tools to boost your productivity`,
    alternates: {
      canonical: `/c/${slug}`,
    },
    openGraph: {
      title: `${category.name} | HiCyou - Free Open Source Directory`,
      description:
        category.description ||
        `Discover the best ${category.name} tools to boost your productivity`,
      url: `/c/${slug}`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const resolvedSearchParams = await searchParams;

  const [tc, tcat] = await Promise.all([
    getTranslations("common"),
    getTranslations("category"),
  ]);

  // Resolve the category first; its id drives the SQL-side bookmark query.
  const category = await getCategoryBySlugTranslated(slug, locale);
  if (!category) {
    notFound();
  }

  // SQL-side filter + search + count, replacing the old full-table pull and
  // in-memory filter. Cost now scales with the category, not the whole table.
  const [{ bookmarks: pageBookmarks, total }, categories] = await Promise.all([
    getBookmarksByCategory(category.id, {
      search: resolvedSearchParams.search,
      page: 1,
      pageSize: 30,
    }),
    getAllCategoriesTranslated(locale),
  ]);

  // Apply translations — applyTranslations returns clones, so reassign
  // instead of relying on the legacy in-place mutate pattern.
  let filteredBookmarks = pageBookmarks;
  if (locale !== "en") {
    const tMap = await getTranslationsForEntities(
      "bookmark",
      pageBookmarks.map((b) => b.id),
      locale,
    );
    filteredBookmarks = pageBookmarks.map((b) => applyTranslations(b, tMap));
  }

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="min-h-screen bg-background">
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: category.name, url: `/c/${category.slug}` },
        ])}
      />
      <JsonLd
        data={generateItemListSchema(
          category.name,
          category.description || `Best ${category.name} tools`,
          `/c/${category.slug}`,
          filteredBookmarks.slice(0, 30).map((b, i) => ({
            title: b.title,
            slug: b.slug,
            url: b.url,
            position: i + 1,
          })),
        )}
      />
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
            currentCategorySlug={slug}
          />
        </Suspense>

        {/* Main Content */}
        <main className="w-full max-w-full flex-1 overflow-x-hidden lg:w-auto">
          <div className="px-4 py-8 lg:px-8">
            {/* Hero Section */}
            <div className="relative mb-12 overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-primary/5 py-4 text-center md:py-5">
              {/* Background Effects */}
              <div className="bg-grid-white/5 absolute inset-0 [mask-image:radial-gradient(white,transparent_85%)]"></div>
              <div
                className="absolute left-1/4 top-0 h-72 w-72 rounded-full opacity-20 blur-3xl"
                style={{
                  backgroundColor: category.color || "hsl(var(--primary))",
                }}
              ></div>
              <div
                className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full opacity-20 blur-3xl"
                style={{
                  backgroundColor: category.color || "hsl(var(--primary))",
                }}
              ></div>

              {/* Content */}
              <div className="relative z-10 px-4">
                {/* Category Badge with Icon */}
                <div className="mb-3 flex items-center justify-center gap-3">
                  {category.icon && (
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl shadow-lg"
                      style={{
                        backgroundColor: category.color
                          ? `${category.color}15`
                          : "hsl(var(--primary) / 0.1)",
                        color: category.color || "hsl(var(--primary))",
                      }}
                    >
                      <DynamicIcon name={category.icon} className="h-6 w-6" />
                    </div>
                  )}
                </div>

                {/* Category Name */}
                <h1 className="mb-2 text-balance text-3xl font-bold leading-tight tracking-tight md:text-4xl">
                  {category.name}
                </h1>

                {/* Category Description */}
                <p className="mx-auto mb-4 max-w-3xl text-balance text-sm text-muted-foreground md:text-base">
                  {category.description ||
                    `Discover the best ${category.name} tools to boost your productivity`}
                </p>

                {/* Stats Badge */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Badge
                    variant="secondary"
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: category.color
                        ? `${category.color}20`
                        : undefined,
                      color: category.color || undefined,
                      borderColor: category.color
                        ? `${category.color}30`
                        : undefined,
                    }}
                  >
                    {total} {total === 1 ? tc("tool") : tc("tools")}
                  </Badge>
                  {resolvedSearchParams.search && (
                    <Badge
                      variant="outline"
                      className="rounded-full px-3 py-1 text-xs font-medium"
                    >
                      {tcat("searchFilter")}: "{resolvedSearchParams.search}"
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Bookmarks Grid */}
            <BookmarkGrid>
              {filteredBookmarks.slice(0, 30).map((bookmark) => (
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

            {filteredBookmarks.length > 0 && (
              <div className="mt-8">
                <CategoryPagination
                  currentPage={1}
                  totalPages={totalPages}
                  basePath={`/c/${slug}`}
                />
              </div>
            )}

            {filteredBookmarks.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">
                  {tc("noResults")}
                  {resolvedSearchParams.search &&
                    `: "${resolvedSearchParams.search}"`}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
