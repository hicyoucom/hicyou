// React + Next Imports
import React from "react";
import { Suspense } from "react";

// Database Imports
import { getAllBookmarks, getAllCategories, getFeaturedBookmarks, getLatestBookmarks } from "@/lib/data";

// Component Imports
import { BookmarkCard } from "@/components/bookmark-card";
import { BookmarkGrid } from "@/components/bookmark-grid";
import { CategorySidebar } from "@/components/category-sidebar";
import { TopNav } from "@/components/top-nav";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

import Balancer from "react-wrap-balancer";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

export default async function Home({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  // 如果有搜索参数，不加载 featured 和 latest
  const showDefaultView = !searchParams.search;

  const [bookmarks, categories, featuredTools, latestTools] = await Promise.all([
    getAllBookmarks(),
    getAllCategories(),
    showDefaultView ? getFeaturedBookmarks(4) : Promise.resolve([]),
    showDefaultView ? getLatestBookmarks(28) : Promise.resolve([]),
  ]);

  const filteredBookmarks = bookmarks.filter((bookmark) => {
    if (!searchParams.search) return true;
    const searchTerm = searchParams.search.toLowerCase();
    return (
      bookmark.title.toLowerCase().includes(searchTerm) ||
      bookmark.description?.toLowerCase().includes(searchTerm) ||
      bookmark.category?.name.toLowerCase().includes(searchTerm) ||
      bookmark.notes?.toLowerCase().includes(searchTerm) ||
      bookmark.overview?.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div className="min-h-screen bg-background">
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
            }))}
            bookmarksCount={bookmarks.length}
          />
        </Suspense>

        {/* Main Content */}
        <main className="flex-1 max-w-full overflow-x-hidden w-full lg:w-auto">

          <div className="px-4 lg:px-8 py-8">
            {/* Hero Section */}
            <div className="relative mb-12 py-20 text-center overflow-hidden rounded-3xl">
              {/* Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5"></div>
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>

              {/* Content */}
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full border bg-background/50 backdrop-blur-sm text-xs font-medium text-muted-foreground">
                  👋 Hi! Cyou
                </div>

                <h1 className="text-5xl font-bold mb-4 tracking-tight leading-tight">
                  <Balancer>
                    See the tools that matter. Curated for you.
                  </Balancer>
                </h1>

                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto mt-8">
                  <Balancer>
                    Explore {bookmarks.length}+ hand-picked tools for building,
                    <br />
                    learning, and creating — updated daily.
                  </Balancer>
                </p>

                <div className="flex items-center justify-center gap-4">
                  <Button asChild size="lg" className="gap-2 shadow-lg">
                    <Link href="/submit">
                      Submit your tool
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* 显示默认视图（Featured + Latest + CTA） */}
            {showDefaultView ? (
              <>
                {/* Featured Tools Section */}
                {featuredTools.length > 0 && (
                  <div className="mb-16">
                    <h2 className="text-3xl font-bold mb-8 text-center">Featured Tools</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {featuredTools.map((tool) => (
                        <Link
                          key={tool.id}
                          href={`/${tool.slug}`}
                          className="group block"
                        >
                          <div className="relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg hover:border-primary/50">
                            {/* Cover Image */}
                            <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                              {tool.ogImage ? (
                                <Image
                                  src={tool.ogImage}
                                  alt={tool.title}
                                  fill
                                  className="object-cover transition-transform group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                                  <span className="text-4xl font-bold text-primary/20">
                                    {tool.title.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            {/* Title */}
                            <div className="p-4">
                              <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                                {tool.title}
                              </h3>
                              {tool.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {tool.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Latest Tools Section */}
                <div className="mb-16">
                  <h2 className="text-3xl font-bold mb-8 text-center">Latest Tools</h2>
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
                          pricingType: bookmark.pricingType,
                          slug: bookmark.slug,
                        }}
                      />
                    ))}
                  </BookmarkGrid>
                </div>

                {/* How to Get Dofollow Links CTA */}
                <Card className="border-primary/20 bg-primary/5 mb-8">
                  <CardHeader>
                    <CardTitle className="text-2xl text-center">How to Get Dofollow Links</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center text-lg text-muted-foreground">
                      It's simple - just display our badge on your website!
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="text-center space-y-3">
                        <div className="bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center mx-auto">
                          <span className="text-2xl font-bold text-primary">1</span>
                        </div>
                        <h3 className="font-semibold">Submit Your Product</h3>
                        <p className="text-sm text-muted-foreground">
                          Fill out the submission form with your product details
                        </p>
                      </div>

                      <div className="text-center space-y-3">
                        <div className="bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center mx-auto">
                          <span className="text-2xl font-bold text-primary">2</span>
                        </div>
                        <h3 className="font-semibold">Add Our Badge</h3>
                        <p className="text-sm text-muted-foreground">
                          Copy and paste the badge code to your website footer
                        </p>
                      </div>

                      <div className="text-center space-y-3">
                        <div className="bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center mx-auto">
                          <span className="text-2xl font-bold text-primary">3</span>
                        </div>
                        <h3 className="font-semibold">Get Dofollow Link</h3>
                        <p className="text-sm text-muted-foreground">
                          Your link automatically upgrades to dofollow within 24h
                        </p>
                      </div>
                    </div>

                    <div className="text-center pt-4">
                      <Link href="/legal/badges">
                        <Button size="lg" className="gap-2">
                          View Badge Options
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
                        pricingType: bookmark.pricingType,
                        slug: bookmark.slug,
                      }}
                    />
                  ))}
                </BookmarkGrid>

                {filteredBookmarks.length === 0 && (
                  <div className="py-16 text-center">
                    <p className="text-muted-foreground">
                      No bookmarks found
                      {searchParams.search && ` matching "${searchParams.search}"`}
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
