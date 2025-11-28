// Next Imports
import { notFound } from "next/navigation";
import Link from "next/link";
import Balancer from "react-wrap-balancer";
import { Suspense } from "react";

// Database Imports
import { getBookmarkBySlug, getAllCategories, getAllBookmarks } from "@/lib/data";

// Component Imports
import { CategorySidebar } from "@/components/category-sidebar";
import { TopNav } from "@/components/top-nav";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, ExternalLink, CheckCircle2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Utils
import { getBookmarkLink, getBookmarkRel } from "@/lib/link-utils";

// Metadata
import { Metadata, ResolvingMetadata } from "next";
import Markdown from "react-markdown";

type Props = {
  params: { slug: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const bookmark = await getBookmarkBySlug(params.slug);

  if (!bookmark) {
    notFound();
  }

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `${bookmark.title} | Directory`,
    description:
      bookmark.description ||
      bookmark.overview ||
      `A curated bookmark from Directory`,
    openGraph: {
      title: bookmark.title,
      description: bookmark.description || bookmark.overview || undefined,
      url: bookmark.url,
      images: [
        ...(bookmark.ogImage ? [bookmark.ogImage] : []),
        ...previousImages,
      ],
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
  const [bookmark, categories, bookmarks] = await Promise.all([
    getBookmarkBySlug(params.slug),
    getAllCategories(),
    getAllBookmarks(),
  ]);

  if (!bookmark) {
    notFound();
  }

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
        <main className="flex-1 max-w-full w-full lg:w-auto">
          <div className="px-4 lg:px-8 py-8">
            <div className="flex flex-col xl:flex-row gap-8 max-w-[1400px] items-start">
              {/* Main Content Area */}
              <div className="flex-1 space-y-6 min-w-0">
                {/* Breadcrumb Navigation */}
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Home
                  </Link>
                  <span>›</span>
                  {bookmark.category && (
                    <>
                      <Link
                        href={`/c/${bookmark.category.slug}`}
                        className="hover:text-foreground transition-colors"
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
                      <div className="relative h-16 w-16 overflow-hidden rounded-xl border bg-white flex items-center justify-center">
                        <img
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-3xl font-bold">
                        {bookmark.title}
                      </h1>
                      {/* Pricing Badge */}
                      <Badge
                        variant={
                          bookmark.pricingType === "Free" ? "default" :
                            bookmark.pricingType === "Freemium" ? "secondary" :
                              "outline"
                        }
                        className="text-sm"
                      >
                        {bookmark.pricingType || "Free"}
                      </Badge>
                    </div>
                    {/* Tagline - below title */}
                    {bookmark.description && (
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        {bookmark.description}
                      </p>
                    )}
                  </div>

                  {/* Visit Button - aligned with logo */}
                  <div className="flex-shrink-0">
                    <Button asChild size="lg" className="gap-2">
                      <Link
                        href={getBookmarkLink(bookmark.url, bookmark.isDofollow)}
                        target="_blank"
                        rel={getBookmarkRel(bookmark.isDofollow)}
                      >
                        Visit
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Cover Image */}
                {bookmark.ogImage && (
                  <div className="overflow-hidden rounded-xl border bg-muted max-w-3xl">
                    <img
                      src={bookmark.ogImage}
                      alt={`${bookmark.title} preview`}
                      className="w-full h-auto object-cover"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>
                )}

                {/* What is ${title} */}
                {bookmark.overview && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">What is {bookmark.title}</h2>
                    <div className="prose prose-gray max-w-none dark:prose-invert">
                      <Markdown
                        components={{
                          p: ({ children }) => (
                            <p className="my-4 leading-relaxed text-muted-foreground">{children}</p>
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
                {Array.isArray(bookmark.keyFeatures) && (bookmark.keyFeatures as string[]).length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Key Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(bookmark.keyFeatures as string[]).map((feature, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Use Cases */}
                {Array.isArray(bookmark.useCases) && (bookmark.useCases as string[]).length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Use Cases</h2>
                    <ul className="space-y-3">
                      {(bookmark.useCases as string[]).map((useCase, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <span className="text-muted-foreground">{useCase}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Why do startups need this tool? */}
                {bookmark.whyStartups && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Why do startups need this tool?</h2>
                    <div className="prose prose-gray max-w-none dark:prose-invert">
                      <Markdown>{bookmark.whyStartups}</Markdown>
                    </div>
                  </div>
                )}

                {/* FAQs */}
                {Array.isArray(bookmark.faqs) && (bookmark.faqs as any[]).length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">FAQs</h2>
                    <Accordion type="single" collapsible className="w-full">
                      {(bookmark.faqs as { question: string; answer: string }[]).map((faq, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                          <AccordionTrigger>{faq.question}</AccordionTrigger>
                          <AccordionContent>
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}

                {/* Alternatives */}
                {bookmark.alternatives && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">{bookmark.title} Alternatives</h2>
                    <div className="flex flex-wrap gap-2">
                      {bookmark.alternatives.split(',').map((alt, index) => (
                        <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                          {alt.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Tools in Category */}
                {bookmark.category && (
                  <div className="pt-8 border-t">
                    <h2 className="text-2xl font-bold mb-6">
                      Other tools in {bookmark.category.name}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {bookmarks
                        .filter(b =>
                          b.category?.id === bookmark.category?.id &&
                          b.id !== bookmark.id
                        )
                        .slice(0, 4)
                        .map((relatedBookmark) => (
                          <Link
                            key={relatedBookmark.id}
                            href={`/${relatedBookmark.slug}`}
                            className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-all"
                          >
                            {relatedBookmark.favicon ? (
                              <div className="h-12 w-12 rounded-lg border bg-white flex items-center justify-center flex-shrink-0">
                                <img
                                  src={relatedBookmark.favicon}
                                  alt=""
                                  className="h-8 w-8 object-contain"
                                />
                              </div>
                            ) : (
                              <div className="h-12 w-12 rounded-lg border bg-muted flex items-center justify-center flex-shrink-0">
                                <Bookmark className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm mb-1 line-clamp-1">
                                {relatedBookmark.title}
                              </h3>
                              {relatedBookmark.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
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
              <aside className="hidden xl:block w-80 flex-shrink-0">
                <div className="sticky top-8 space-y-6">
                  {/* Sponsor Card */}
                  {process.env.NEXT_PUBLIC_SPONSOR_IMAGE_URL && process.env.NEXT_PUBLIC_SPONSOR_LINK && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <a
                          href="https://www.hicyou.com/sponsors"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-lg hover:underline"
                        >
                          Sponsor
                        </a>
                      </div>
                      <div className="block rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-shadow">
                        <a
                          href={process.env.NEXT_PUBLIC_SPONSOR_LINK}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          className="block"
                        >
                          <img
                            src={process.env.NEXT_PUBLIC_SPONSOR_IMAGE_URL}
                            alt={process.env.NEXT_PUBLIC_SPONSOR_TEXT || "Sponsor"}
                            className="w-full h-auto"
                          />
                        </a>
                        {process.env.NEXT_PUBLIC_SPONSOR_TEXT && (
                          <div className="p-4 flex items-center justify-center gap-2">
                            <a
                              href={process.env.NEXT_PUBLIC_SPONSOR_LINK}
                              target="_blank"
                              rel="noopener noreferrer sponsored"
                              className="text-sm font-medium hover:underline"
                            >
                              {process.env.NEXT_PUBLIC_SPONSOR_TEXT}
                            </a>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-muted-foreground hover:text-foreground" asChild>
                              <a
                                href="https://www.hicyou.com/sponsors"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="View Sponsors"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit Your Tool Card */}
                  <div className="rounded-xl border bg-card p-6 space-y-4">
                    <h3 className="font-semibold text-lg">Submit Your Tool</h3>
                    <p className="text-sm text-muted-foreground">
                      Get featured on Findly Tools and reach thousands of potential users
                    </p>
                    <Button asChild className="w-full">
                      <Link href="/submit">Submit Now</Link>
                    </Button>
                    <ul className="text-xs text-muted-foreground space-y-2">
                      <li>• Dofollow backlinks</li>
                      <li>• Lifetime listing</li>
                      <li>• Starting from $0</li>
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
