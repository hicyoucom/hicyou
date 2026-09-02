import React from "react";
import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";

// Docker/Zeabur builds intentionally have no database secret. Render this
// database-backed entry point at runtime; its data helpers remain cached.
export const dynamic = "force-dynamic";

import { getAllCategoriesTranslated, getTagsWithCount } from "@/lib/data";
import { CategorySidebar } from "@/components/category-sidebar";
import { TopNav } from "@/components/top-nav";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Tags | HiCyou - Free Open Source Directory",
  description: "Browse tools by tags. Discover curated SaaS tools organized by topic.",
  alternates: { canonical: "/tags" },
};

export default async function TagsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('tags');
  const [categories, tagsWithCount] = await Promise.all([
    getAllCategoriesTranslated(locale),
    getTagsWithCount(),
  ]);

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
            <div className="relative mb-12 py-12 text-center overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background to-primary/5">
              <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]"></div>
              <div className="relative z-10 px-4">
                <div className="flex items-center justify-center mb-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl shadow-lg bg-primary/10 text-primary">
                    <Tag className="w-6 h-6" />
                  </div>
                </div>
                <h1 className="text-balance text-3xl md:text-4xl font-bold mb-2 tracking-tight">
                  {t('title')}
                </h1>
                <p className="text-balance text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                  {t('subtitle', { count: tagsWithCount.length })}
                </p>
              </div>
            </div>

            {/* Tag Cloud */}
            <div className="flex flex-wrap gap-3 justify-center">
              {tagsWithCount.map((tag) => (
                <Link key={tag.id} href={`/tags/${tag.slug}`}>
                  <Badge
                    variant="secondary"
                    className="px-4 py-2 text-sm font-medium rounded-full hover:shadow-md transition-all cursor-pointer"
                    style={{
                      backgroundColor: tag.color ? `${tag.color}15` : undefined,
                      color: tag.color || undefined,
                      borderColor: tag.color ? `${tag.color}30` : undefined,
                    }}
                  >
                    {tag.name}
                    <span className="ml-2 text-xs opacity-60">{tag.count}</span>
                  </Badge>
                </Link>
              ))}
            </div>

            {tagsWithCount.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">{t('noTags')}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
