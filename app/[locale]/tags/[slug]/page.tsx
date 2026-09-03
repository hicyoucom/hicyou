import React from "react";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';

// NOTE: reads `searchParams.page` for pagination, so this page is dynamic;
// `export const revalidate` would be a no-op. Underlying reads are still
// cached via unstable_cache in lib/data.ts.

import { getAllCategoriesTranslated, getTagBySlug, getBookmarksByTagSlug } from "@/lib/data";
import { BookmarkCard } from "@/components/bookmark-card";
import { BookmarkGrid } from "@/components/bookmark-grid";
import { CategorySidebar } from "@/components/category-sidebar";
import { TopNav } from "@/components/top-nav";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const tag = await getTagBySlug(params.slug);
  if (!tag) return { title: "Tag Not Found" };

  return {
    title: `${tag.name} Tools | HiCyou - Free Open Source Directory`,
    description: `Discover the best ${tag.name} tools. Browse our curated collection of ${tag.name} SaaS products.`,
    alternates: { canonical: `/tags/${params.slug}` },
    openGraph: {
      title: `${tag.name} Tools | HiCyou`,
      description: `Discover the best ${tag.name} tools.`,
      url: `/tags/${params.slug}`,
    },
  };
}

export default async function TagPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { locale } = params;
  const page = parseInt(searchParams.page || "1", 10);

  const [tc, tt] = await Promise.all([
    getTranslations('common'),
    getTranslations('tags'),
  ]);

  const [tag, categories, { bookmarks, total }] = await Promise.all([
    getTagBySlug(params.slug),
    getAllCategoriesTranslated(locale),
    getBookmarksByTagSlug(params.slug, page),
  ]);

  if (!tag) notFound();

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="flex max-w-[1800px] mx-auto">
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
          />
        </Suspense>

        <main className="flex-1 max-w-full overflow-x-hidden w-full lg:w-auto">
          <div className="px-4 lg:px-8 py-8">
            {/* Hero */}
            <div className="relative mb-12 py-4 md:py-5 text-center overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-primary/5">
              <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]"></div>
              <div
                className="absolute top-0 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-20"
                style={{ backgroundColor: tag.color || "hsl(var(--primary))" }}
              ></div>
              <div className="relative z-10 px-4">
                <div className="flex items-center justify-center mb-3">
                  <div
                    className="flex items-center justify-center w-12 h-12 rounded-xl shadow-lg"
                    style={{
                      backgroundColor: tag.color ? `${tag.color}15` : "hsl(var(--primary) / 0.1)",
                      color: tag.color || "hsl(var(--primary))",
                    }}
                  >
                    <Tag className="w-6 h-6" />
                  </div>
                </div>
                <h1 className="text-balance text-3xl md:text-4xl font-bold mb-2 tracking-tight">
                  {tag.name}
                </h1>
                <div className="flex items-center justify-center gap-3">
                  <Badge
                    variant="secondary"
                    className="px-3 py-1 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: tag.color ? `${tag.color}20` : undefined,
                      color: tag.color || undefined,
                    }}
                  >
                    {total} {total === 1 ? tc('tool') : tc('tools')}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Grid */}
            <BookmarkGrid>
              {bookmarks.map((bookmark) => (
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

            {bookmarks.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">{tt('noTools')}</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <a
                    key={p}
                    href={`/tags/${params.slug}?page=${p}`}
                    className={`px-3 py-1 rounded-md text-sm ${
                      p === page
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {p}
                  </a>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
