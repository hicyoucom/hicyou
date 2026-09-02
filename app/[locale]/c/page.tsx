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
import { getTranslations } from 'next-intl/server';

export const metadata: Metadata = {
  title: "All Categories | Directory",
  description: "Browse all tool categories and find the one that fits your needs",
};

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('allCategories');
  const [categories, categoryCountMap, totalBookmarks] = await Promise.all([
    getAllCategoriesTranslated(locale),
    getCategoryBookmarkCounts(),
    getBookmarksCount(),
  ]);

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
              groupKey: cat.groupKey,
            }))}
          />
        </Suspense>

        {/* Main Content */}
        <main className="flex-1 max-w-full overflow-x-hidden w-full lg:w-auto">

          <div className="px-4 lg:px-8 py-8">
            {/* Hero Section */}
            <div className="relative mb-12 py-4 md:py-5 text-center overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-primary/5">
              {/* Background Effects */}
              <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]"></div>
              <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
              
              {/* Content */}
              <div className="relative z-10 px-4">
                {/* Icon Badge */}
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl shadow-lg bg-primary/10">
                    <Grid3x3 className="w-6 h-6 text-primary" />
                  </div>
                </div>
                
                {/* Title */}
                <h1 className="text-balance text-3xl md:text-4xl font-bold mb-2 tracking-tight leading-tight">
                  {t('title')}
                </h1>

                {/* Description */}
                <p className="text-balance text-sm md:text-base text-muted-foreground mb-4 max-w-3xl mx-auto">
                  {t('description')}
                </p>

                {/* Stats Badges */}
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Badge variant="secondary" className="px-3 py-1 text-xs font-medium rounded-full">
                    <Layers className="w-3 h-3 mr-1.5" />
                    {categories.length} {t('statsCategories')}
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1 text-xs font-medium rounded-full">
                    {totalBookmarks} {t('totalTools')}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => {
                const bookmarkCount = categoryCountMap[category.id] || 0;
                
                return (
                  <Link
                    key={category.id}
                    href={`/c/${category.slug}`}
                    className="group relative flex flex-col gap-3 overflow-hidden rounded-lg border bg-card p-6 transition-all duration-200 hover:shadow-md hover:border-primary/50"
                  >
                    {/* Icon and Title */}
                    <div className="flex items-start gap-3">
                      {category.icon ? (
                        <div 
                          className="flex h-12 w-12 items-center justify-center rounded-lg border flex-shrink-0"
                          style={category.color ? { 
                            backgroundColor: `${category.color}15`,
                            borderColor: `${category.color}50`
                          } : undefined}
                        >
                          <DynamicIcon 
                            name={category.icon} 
                            className="h-6 w-6" 
                            style={category.color ? { color: category.color } : undefined}
                            aria-label={category.name}
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted flex-shrink-0">
                          <span className="text-lg font-semibold text-muted-foreground">
                            {category.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {bookmarkCount} {t('toolPlural')}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {category.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {category.description}
                      </p>
                    )}

                    {/* Hover Arrow */}
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <p className="text-muted-foreground">
                  {t('empty')}
                </p>
              </div>
            )}

            {/* Stats Section */}
            <div className="mt-12 p-6 rounded-lg border bg-card">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary mb-1">
                    {categories.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('statsCategories')}
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-1">
                    {totalBookmarks}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('statsTools')}
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-1">
                    {totalBookmarks > 0
                      ? Math.round(totalBookmarks / categories.length)
                      : 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('statsAverage')}
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
