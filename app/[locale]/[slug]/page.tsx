// Next Imports
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

// Database Imports
import {
  getBookmarkBySlug,
  getAllCategoriesTranslated,
  getRelatedBookmarks,
  getTranslationsForEntity,
  applyDetailTranslations,
} from "@/lib/data";

// Component Imports
import { CategorySidebar } from "@/components/category-sidebar";
import { TopNav } from "@/components/top-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCredibilityCard } from "@/components/product-credibility-card";
import { SafeExternalImage } from "@/components/safe-external-image";
import { SponsorCard } from "@/components/sponsor-card";
import { Bookmark, ExternalLink, CheckCircle2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Utils
import { getBookmarkLink, getBookmarkRel } from "@/lib/link-utils";
import {
  getDisplayableListingItems,
  getProductCredibility,
} from "@/lib/product-credibility";

// JSON-LD
import {
  JsonLd,
  generateSoftwareApplicationSchema,
  generateBreadcrumbSchema,
} from "@/components/json-ld";

// Metadata
import { Metadata, ResolvingMetadata } from "next";
import Markdown from "react-markdown";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug, locale } = await params;
  const rawBookmark = await getBookmarkBySlug(slug);

  if (!rawBookmark) {
    notFound();
  }

  const previousImages = (await parent).openGraph?.images || [];

  // Apply translations for metadata (clone — never mutate the cached row).
  let bookmark = rawBookmark;
  if (locale !== "en") {
    const t = await getTranslationsForEntity(
      "bookmark",
      rawBookmark.id,
      locale,
    );
    bookmark = {
      ...rawBookmark,
      ...(t.title ? { title: t.title } : {}),
      ...(t.description ? { description: t.description } : {}),
      ...(t.overview ? { overview: t.overview } : {}),
    };
  }

  return {
    title: `${bookmark.title} | HiCyou - Free Open Source Directory`,
    description:
      bookmark.description ||
      bookmark.overview ||
      `A curated bookmark from Directory`,
    openGraph: {
      title: bookmark.title,
      description: bookmark.description || bookmark.overview || undefined,
      url: `/${slug}`,
      images: [
        ...(bookmark.ogImage ? [bookmark.ogImage] : []),
        ...previousImages,
      ],
    },
    alternates: {
      canonical: `/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: bookmark.title,
      description: bookmark.description || bookmark.overview || undefined,
      images: bookmark.ogImage ? [bookmark.ogImage] : [],
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug, locale } = await params;
  const t = await getTranslations("detail");
  const [rawBookmark, categories] = await Promise.all([
    getBookmarkBySlug(slug),
    getAllCategoriesTranslated(locale),
  ]);

  if (!rawBookmark) {
    notFound();
  }

  // Related bookmarks and translations are independent — fetch together.
  const [relatedBookmarks, entityTranslations] = await Promise.all([
    rawBookmark.categories.length > 0
      ? getRelatedBookmarks(
          rawBookmark.categories.map((category) => category.id),
          rawBookmark.id,
          4,
        )
      : rawBookmark.category
        ? getRelatedBookmarks(rawBookmark.category.id, rawBookmark.id, 4)
        : Promise.resolve([]),
    locale !== "en"
      ? getTranslationsForEntity("bookmark", rawBookmark.id, locale)
      : Promise.resolve({}),
  ]);

  // Apply translations (returns new object — never mutate cached bookmark refs).
  const bookmark: typeof rawBookmark =
    locale !== "en"
      ? applyDetailTranslations(rawBookmark, entityTranslations)
      : rawBookmark;
  const translatedCategoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const assignedCategories = bookmark.categories.map((category) => ({
    ...category,
    ...(translatedCategoriesById.get(category.id) ?? {}),
    position: category.position,
  }));

  const keyFeatures = getDisplayableListingItems(bookmark.keyFeatures);
  const useCases = getDisplayableListingItems(bookmark.useCases);
  const credibility = getProductCredibility(bookmark);
  const credibilityLabels = {
    listingDetails: t("credibility.listingDetails"),
    directoryRecord: t("credibility.directoryRecord"),
    listed: t("credibility.listed"),
    listedWebsite: t("credibility.listedWebsite"),
    publishedInDirectory: t("credibility.publishedInDirectory"),
    recordCreated: t("credibility.recordCreated"),
    recordUpdated: t("credibility.recordUpdated"),
    listingInformation: t("credibility.listingInformation"),
    overviewIncluded: t("credibility.overviewIncluded"),
    keyFeaturesIncluded: t("credibility.keyFeaturesIncluded", {
      count: credibility.keyFeatureCount,
    }),
    useCasesIncluded: t("credibility.useCasesIncluded", {
      count: credibility.useCaseCount,
    }),
    directoryRecordNotice: t("credibility.directoryRecordNotice"),
    externalSiteNotice: t("credibility.externalSiteNotice"),
  };

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    ...(bookmark.category
      ? [{ name: bookmark.category.name, url: `/c/${bookmark.category.slug}` }]
      : []),
    { name: bookmark.title, url: `/${bookmark.slug}` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={generateSoftwareApplicationSchema(bookmark)} />
      <JsonLd data={generateBreadcrumbSchema(breadcrumbItems)} />
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
        <main className="w-full max-w-full flex-1 lg:w-auto">
          <div className="px-4 py-8 lg:px-8">
            <div className="flex max-w-[1400px] flex-col items-start gap-8 xl:flex-row">
              {/* Main Content Area */}
              <div className="min-w-0 flex-1 space-y-6">
                {/* Breadcrumb Navigation */}
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link
                    href="/"
                    className="flex items-center gap-1 transition-colors hover:text-foreground"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                    {t("home")}
                  </Link>
                  <span>›</span>
                  {bookmark.category && (
                    <>
                      <Link
                        href={`/c/${bookmark.category.slug}`}
                        className="transition-colors hover:text-foreground"
                      >
                        {bookmark.category.name}
                      </Link>
                      <span>›</span>
                    </>
                  )}
                  <span className="text-foreground">{bookmark.title}</span>
                </nav>

                {/* Header with Logo and Title */}
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  <div className="flex-shrink-0">
                    {bookmark.favicon ? (
                      <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border bg-white">
                        <SafeExternalImage
                          src={bookmark.favicon}
                          alt={`${bookmark.title} logo`}
                          className="h-12 w-12 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-muted">
                        <Bookmark className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Title and Tagline */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-3xl font-bold">{bookmark.title}</h1>
                    </div>
                    {/* Tagline - below title */}
                    {bookmark.description && (
                      <p className="text-lg leading-relaxed text-muted-foreground">
                        {bookmark.description}
                      </p>
                    )}
                    {assignedCategories.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {assignedCategories.map((category) => (
                          <Link key={category.id} href={`/c/${category.slug}`}>
                            <Badge
                              variant={
                                category.position === 0
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {category.name}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Visit Button - aligned with logo */}
                  <div className="flex-shrink-0">
                    <Button asChild size="lg" className="gap-2">
                      <Link
                        href={getBookmarkLink(
                          bookmark.url,
                          bookmark.isDofollow,
                        )}
                        target="_blank"
                        rel={getBookmarkRel(bookmark.isDofollow)}
                      >
                        {t("visit")}
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="xl:hidden">
                  <ProductCredibilityCard
                    credibility={credibility}
                    labels={credibilityLabels}
                    locale={locale}
                    headingId="listing-details-mobile"
                  />
                </div>

                {/* Cover Image */}
                {bookmark.ogImage && (
                  <div className="max-w-3xl overflow-hidden rounded-xl border bg-muted">
                    <SafeExternalImage
                      src={bookmark.ogImage}
                      alt={`${bookmark.title} preview`}
                      className="h-auto w-full object-cover"
                      style={{ maxHeight: "400px" }}
                    />
                  </div>
                )}

                {/* What is ${title} */}
                {bookmark.overview && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">
                      {t("whatIs", { name: bookmark.title })}
                    </h2>
                    <div className="prose prose-gray max-w-none dark:prose-invert">
                      <Markdown
                        components={{
                          p: ({ children }) => (
                            <p className="my-4 leading-relaxed text-muted-foreground">
                              {children}
                            </p>
                          ),
                          a: ({ children, href }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {bookmark.overview}
                      </Markdown>
                    </div>
                  </div>
                )}

                {/* Key Features */}
                {keyFeatures.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">{t("keyFeatures")}</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {keyFeatures.map((feature, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                          <span className="text-muted-foreground">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Use Cases */}
                {useCases.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">{t("useCases")}</h2>
                    <ul className="space-y-3">
                      {useCases.map((useCase, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                          <span className="text-muted-foreground">
                            {useCase}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Why do startups need this tool? */}
                {bookmark.whyStartups && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">{t("whyStartups")}</h2>
                    <div className="prose prose-gray max-w-none dark:prose-invert">
                      <Markdown>{bookmark.whyStartups}</Markdown>
                    </div>
                  </div>
                )}

                {/* FAQs */}
                {Array.isArray(bookmark.faqs) && bookmark.faqs.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">{t("faqs")}</h2>
                    <Accordion type="single" collapsible className="w-full">
                      {(
                        bookmark.faqs as {
                          question: string;
                          answer: string;
                        }[]
                      ).map((faq, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                          <AccordionTrigger>{faq.question}</AccordionTrigger>
                          <AccordionContent>{faq.answer}</AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}

                {/* Alternatives */}
                {bookmark.alternatives && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">
                      {t("alternatives", { name: bookmark.title })}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {bookmark.alternatives.split(",").map((alt, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-3 py-1 text-sm"
                        >
                          {alt.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Tools in Category */}
                {bookmark.category && (
                  <div className="border-t pt-8">
                    <h2 className="mb-6 text-2xl font-bold">
                      {t("otherTools", { category: bookmark.category.name })}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {relatedBookmarks.map((relatedBookmark) => (
                        <Link
                          key={relatedBookmark.id}
                          href={`/${relatedBookmark.slug}`}
                          className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-all hover:shadow-md"
                        >
                          {relatedBookmark.favicon ? (
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-white">
                              <SafeExternalImage
                                src={relatedBookmark.favicon}
                                alt=""
                                className="h-8 w-8 object-contain"
                              />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-muted">
                              <Bookmark className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="mb-1 line-clamp-1 text-sm font-semibold">
                              {relatedBookmark.title}
                            </h3>
                            {relatedBookmark.description && (
                              <p className="line-clamp-2 text-xs text-muted-foreground">
                                {relatedBookmark.description}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sidebar */}
              <aside className="hidden w-80 flex-shrink-0 xl:block">
                <div className="sticky top-8 space-y-6">
                  <ProductCredibilityCard
                    credibility={credibility}
                    labels={credibilityLabels}
                    locale={locale}
                    headingId="listing-details-desktop"
                  />

                  <SponsorCard label={t("sponsor")} viewLabel="View Sponsors" />

                  {/* Submit Your Tool Card */}
                  <div className="space-y-4 rounded-xl border bg-card p-6">
                    <h3 className="text-lg font-semibold">
                      {t("submitYourTool")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("submitDesc")}
                    </p>
                    <Button asChild className="w-full">
                      <Link href="/submit">{t("submitNow")}</Link>
                    </Button>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li>• {t("dofollowLinks")}</li>
                      <li>• {t("lifetimeListing")}</li>
                      <li>• {t("startingFree")}</li>
                    </ul>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
