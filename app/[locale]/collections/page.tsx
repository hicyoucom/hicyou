import React from "react";
import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";

// Docker/Zeabur builds intentionally have no database secret. Render this
// database-backed entry point at runtime; its data helpers remain cached.
export const dynamic = "force-dynamic";

import { getAllCategoriesTranslated, getAllCollections } from "@/lib/data";
import { CategorySidebar } from "@/components/category-sidebar";
import { TopNav } from "@/components/top-nav";
import { Badge } from "@/components/ui/badge";
import { Library, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SafeExternalImage } from "@/components/safe-external-image";

export const metadata: Metadata = {
  title: "Collections | HiCyou - Free Open Source Directory",
  description: "Curated collections of the best SaaS tools, organized by theme and use case.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('collections');
  const [categories, collections] = await Promise.all([
    getAllCategoriesTranslated(locale),
    getAllCollections(false),
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
              <div className="relative z-10 px-4">
                <div className="flex items-center justify-center mb-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl shadow-lg bg-primary/10 text-primary">
                    <Library className="w-6 h-6" />
                  </div>
                </div>
                <h1 className="text-balance text-3xl md:text-4xl font-bold mb-2 tracking-tight">
                  {t('title')}
                </h1>
                <p className="text-balance text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                  {t('subtitle')}
                </p>
              </div>
            </div>

            {/* Collection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="group block"
                >
                  <div className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all hover:border-primary/50">
                    {collection.coverImage && (
                      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                        <SafeExternalImage
                          src={collection.coverImage}
                          alt={collection.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-5 space-y-2">
                      <h2 className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-1">
                        {collection.title}
                      </h2>
                      {collection.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {collection.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <Badge variant="secondary" className="text-xs">
                          {collection.publishedAt
                            ? new Date(collection.publishedAt).toLocaleDateString()
                            : ""}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {collections.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">{t('noCollections')}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
