import React from "react";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import Link from "next/link";

// Cached for 1h; mutations invalidate the relevant cache tag (see lib/actions/).
export const revalidate = 3600;

import { getAllCategoriesTranslated, getCollectionWithBookmarksTranslated } from "@/lib/data";
import { CategorySidebar } from "@/components/category-sidebar";
import { TopNav } from "@/components/top-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Bookmark, CheckCircle2 } from "lucide-react";
import Markdown from "react-markdown";
import { getBookmarkLink, getBookmarkRel } from "@/lib/link-utils";
import { getDisplayableListingItems } from "@/lib/product-credibility";
import { JsonLd, generateCollectionPageSchema, generateBreadcrumbSchema } from "@/components/json-ld";
import { SafeExternalImage } from "@/components/safe-external-image";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const data = await getCollectionWithBookmarksTranslated(params.slug, params.locale ?? "en");
  if (!data) return { title: "Collection Not Found" };

  const { collection } = data;
  return {
    title: `${collection.title} | HiCyou Collections`,
    description: collection.description || `A curated collection of the best tools.`,
    alternates: { canonical: `/collections/${params.slug}` },
    openGraph: {
      title: collection.title,
      description: collection.description || undefined,
      url: `/collections/${params.slug}`,
      images: collection.coverImage ? [collection.coverImage] : [],
    },
  };
}

export default async function CollectionDetailPage(props: Props) {
  const params = await props.params;
  const { locale } = params;
  const [tc, tn, tco] = await Promise.all([
    getTranslations('common'),
    getTranslations('nav'),
    getTranslations('collections'),
  ]);

  const [data, categories] = await Promise.all([
    getCollectionWithBookmarksTranslated(params.slug, locale),
    getAllCategoriesTranslated(locale),
  ]);

  if (!data) notFound();

  const { collection, bookmarks } = data;

  return (
    <div className="min-h-screen bg-background">
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Collections", url: "/collections" },
          { name: collection.title, url: `/collections/${collection.slug}` },
        ])}
      />
      <JsonLd
        data={generateCollectionPageSchema({
          ...collection,
          bookmarks: bookmarks.map((b) => ({ title: b.title, slug: b.slug, url: b.url })),
        })}
      />
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

        <main className="flex-1 max-w-full w-full lg:w-auto">
          <div className="px-4 lg:px-8 py-8 max-w-4xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link href="/" className="hover:text-foreground transition-colors">{tc('home')}</Link>
              <span>&rsaquo;</span>
              <Link href="/collections" className="hover:text-foreground transition-colors">{tn('collections')}</Link>
              <span>&rsaquo;</span>
              <span className="text-foreground">{collection.title}</span>
            </nav>

            {/* Cover Image */}
            {collection.coverImage && (
              <div className="overflow-hidden rounded-xl border bg-muted mb-8">
                <SafeExternalImage
                  src={collection.coverImage}
                  alt={collection.title}
                  className="w-full h-auto object-cover"
                  style={{ maxHeight: "360px" }}
                />
              </div>
            )}

            {/* Title & Description */}
            <div className="space-y-4 mb-8">
              <h1 className="text-balance text-4xl font-bold tracking-tight">
                {collection.title}
              </h1>
              {collection.description && (
                <p className="text-lg text-muted-foreground">{collection.description}</p>
              )}
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  {bookmarks.length} {bookmarks.length === 1 ? tc('tool') : tc('tools')}
                </Badge>
                {collection.publishedAt && (
                  <span className="text-sm text-muted-foreground">
                    {tc('published')} {new Date(collection.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Content / Introduction */}
            {collection.content && (
              <div className="prose prose-gray max-w-none dark:prose-invert mb-10">
                <Markdown>{collection.content}</Markdown>
              </div>
            )}

            {/* Tool List */}
            <div className="space-y-4">
              {bookmarks.map((bookmark, index) => {
                const keyFeatures = getDisplayableListingItems(bookmark.keyFeatures).slice(0, 3);

                return (
                <div
                  key={bookmark.id}
                  className="flex items-start gap-4 p-5 rounded-xl border bg-card hover:shadow-md transition-all"
                >
                  {/* Rank Number */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>

                  {/* Logo */}
                  <div className="flex-shrink-0">
                    {bookmark.favicon ? (
                      <div className="h-12 w-12 rounded-lg border bg-white flex items-center justify-center">
                        <SafeExternalImage
                          src={bookmark.favicon}
                          alt={`${bookmark.title} logo`}
                          className="h-8 w-8 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-lg border bg-muted flex items-center justify-center">
                        <Bookmark className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/${bookmark.slug}`} className="font-semibold hover:text-primary transition-colors">
                        {bookmark.title}
                      </Link>
                      {bookmark.category && (
                        <Badge variant="outline" className="text-xs">
                          {bookmark.category.name}
                        </Badge>
                      )}
                    </div>
                    {bookmark.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {bookmark.description}
                      </p>
                    )}
                    {bookmark.note && (
                      <p className="text-sm text-primary/80 italic">
                        {bookmark.note}
                      </p>
                    )}
                    {keyFeatures.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {keyFeatures.map((feature, i) => (
                          <span key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Visit Button */}
                  <div className="flex-shrink-0">
                    <Button asChild size="sm" variant="outline" className="gap-1">
                      <Link
                        href={getBookmarkLink(bookmark.url, bookmark.isDofollow)}
                        target="_blank"
                        rel={getBookmarkRel(bookmark.isDofollow)}
                      >
                        {tc('visit')}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>

            {bookmarks.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">{tco('empty')}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
