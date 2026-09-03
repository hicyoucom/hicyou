// React + Next Imports
import React from "react";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';

// NOTE: this page reads `searchParams` (search + page), which forces dynamic
// rendering. `export const revalidate` would be a no-op here. lib/data.ts
// caches the underlying queries via unstable_cache; that's where the win
// actually lands.

// Database Imports
import { getBookmarksByCategory, getAllCategoriesTranslated, getCategoryBySlug, getCategoryBySlugTranslated, getTranslationsForEntities, applyTranslations } from "@/lib/data";

// Component Imports
import { BookmarkCard } from "@/components/bookmark-card";
import { BookmarkGrid } from "@/components/bookmark-grid";
import { CategorySidebar } from "@/components/category-sidebar";
import { CategoryPagination } from "@/components/category-pagination";
import { TopNav } from "@/components/top-nav";
import { Badge } from "@/components/ui/badge";
import { DynamicIcon } from "@/lib/icon-utils";
import { JsonLd, generateItemListSchema, generateBreadcrumbSchema } from "@/components/json-ld";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
};

export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Category Not Found",
    };
  }

  return {
    title: `${category.name} | HiCyou - Free Open Source Directory`,
    description: category.description || `Discover the best ${category.name} tools to boost your productivity`,
    alternates: {
      canonical: `/c/${slug}`,
    },
    openGraph: {
      title: `${category.name} | HiCyou - Free Open Source Directory`,
      description: category.description || `Discover the best ${category.name} tools to boost your productivity`,
      url: `/c/${slug}`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug, locale } = await params;
  const resolvedSearchParams = await searchParams;

  const [tc, tcat] = await Promise.all([
    getTranslations('common'),
    getTranslations('category'),
  ]);

  // Resolve the category first; its id drives the SQL-side bookmark query.
  const category = await getCategoryBySlugTranslated(slug, locale);
  if (!category) {
    notFound();
  }

  // SQL-side filter + search + count, replacing the old full-table pull and
  // in-memory filter. Cost now scales with the category, not the whole table.
  const [{ bookmarks: pageBookmarks, total }, categories] = await Promise.all([
    getBookmarksByCategory(category.id, { search: resolvedSearchParams.search, page: 1, pageSize: 30 }),
    getAllCategoriesTranslated(locale),
  ]);

  // Apply translations — applyTranslations returns clones, so reassign
  // instead of relying on the legacy in-place mutate pattern.
  let filteredBookmarks = pageBookmarks;
  if (locale !== "en") {
    const tMap = await getTranslationsForEntities("bookmark", pageBookmarks.map(b => b.id), locale);
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
      <div className="flex max-w-[1800px] mx-auto">
        {/* Left Sidebar */}
        <Suspense fallback={<div className="hidden lg:block w-56 pr-6 border-r">Loading...</div>}>
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
        <main className="flex-1 max-w-full overflow-x-hidden w-full lg:w-auto">

          <div className="px-4 lg:px-8 py-8">
            {/* Hero Section */}
            <div className="relative mb-12 py-4 md:py-5 text-center overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-primary/5">
              {/* Background Effects */}
              <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]"></div>
              <div
                className="absolute top-0 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-20"
                style={{ backgroundColor: category.color || 'hsl(var(--primary))' }}
              ></div>
              <div
                className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-20"
                style={{ backgroundColor: category.color || 'hsl(var(--primary))' }}
              ></div>

              {/* Content */}
              <div className="relative z-10 px-4">
                {/* Category Badge with Icon */}
                <div className="flex items-center justify-center gap-3 mb-3">
                  {category.icon && (
                    <div
                      className="flex items-center justify-center w-12 h-12 rounded-xl shadow-lg"
                      style={{
                        backgroundColor: category.color ? `${category.color}15` : 'hsl(var(--primary) / 0.1)',
                        color: category.color || 'hsl(var(--primary))'
                      }}
                    >
                      <DynamicIcon name={category.icon} className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Category Name */}
                <h1 className="text-balance text-3xl md:text-4xl font-bold mb-2 tracking-tight leading-tight">
                  {category.name}
                </h1>

                {/* Category Description */}
                <p className="text-balance text-sm md:text-base text-muted-foreground mb-4 max-w-3xl mx-auto">
                  {category.description || `Discover the best ${category.name} tools to boost your productivity`}
                </p>

                {/* Stats Badge */}
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Badge
                    variant="secondary"
                    className="px-3 py-1 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: category.color ? `${category.color}20` : undefined,
                      color: category.color || undefined,
                      borderColor: category.color ? `${category.color}30` : undefined,
                    }}
                  >
                    {total} {total === 1 ? tc('tool') : tc('tools')}
                  </Badge>
                  {resolvedSearchParams.search && (
                    <Badge variant="outline" className="px-3 py-1 text-xs font-medium rounded-full">
                      {tcat('searchFilter')}: "{resolvedSearchParams.search}"
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Bookmarks Grid */}
            <BookmarkGrid>
              {filteredBookmarks
                .slice(0, 30)
                .map((bookmark) => (
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
                  {tc('noResults')}
                  {resolvedSearchParams.search && `: "${resolvedSearchParams.search}"`}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
