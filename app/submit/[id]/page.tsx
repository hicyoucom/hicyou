import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db/client";
import { submissions, categories } from "@/db/schema";
import { eq } from "drizzle-orm";

// Component Imports
import { TopNav } from "@/components/top-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Bookmark, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Utils
import { getBookmarkLink, getBookmarkRel } from "@/lib/link-utils";
import Markdown from "react-markdown";

type Props = {
    params: { id: string };
};

async function getSubmission(id: number) {
    const results = await db
        .select({
            submission: submissions,
            category: categories,
        })
        .from(submissions)
        .leftJoin(categories, eq(submissions.categoryId, categories.id))
        .where(eq(submissions.id, id))
        .limit(1);

    if (results.length === 0) {
        return null;
    }

    return results[0];
}

export default async function SubmissionPage({ params }: Props) {
    const id = parseInt(params.id);
    if (isNaN(id)) {
        notFound();
    }

    const data = await getSubmission(id);

    if (!data) {
        notFound();
    }

    const { submission, category } = data;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Visibility Logic
    const isPublished = submission.status === "published";
    const isOwner = user && user.id === submission.userId;
    // TODO: Add admin check here if needed
    const isAdmin = false;

    if (!isPublished && !isOwner && !isAdmin) {
        notFound(); // Hide from public if not published and not owner
    }

    // Force nofollow if not published (even if badge verified, until approved)
    const isDofollow = isPublished ? submission.isDofollow : false;

    return (
        <div className="min-h-screen bg-background">
            <TopNav />
            <div className="flex max-w-[1800px] mx-auto">
                {/* Main Content */}
                <main className="flex-1 max-w-full w-full lg:w-auto">
                    <div className="px-4 lg:px-8 py-8">
                        <div className="flex flex-col xl:flex-row gap-8 max-w-[1400px] items-start mx-auto">
                            {/* Main Content Area */}
                            <div className="flex-1 space-y-6 min-w-0">

                                {/* Status Alert for Owner */}
                                {!isPublished && (
                                    <>
                                        <Alert variant="default" className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                                            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                                            <AlertTitle className="text-yellow-800 dark:text-yellow-500">Submission Under Review</AlertTitle>
                                            <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                                                This submission is currently <strong>{submission.status}</strong>. It is only visible to you.
                                                Once approved, it will be published to the directory.
                                            </AlertDescription>
                                        </Alert>

                                        {/* Badge Verification Prompt */}
                                        {!submission.badgeVerified && (
                                            <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                                                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                                                <AlertTitle className="text-blue-800 dark:text-blue-500">Get Dofollow Link</AlertTitle>
                                                <AlertDescription className="text-blue-700 dark:text-blue-400 space-y-2">
                                                    <p>
                                                        Add our badge to your website and verify it to get a <strong>dofollow + ugc</strong> link (better for SEO).
                                                        Without verification, you'll get a <strong>nofollow</strong> link.
                                                    </p>
                                                    <div className="flex gap-2 mt-3">
                                                        <Button asChild variant="outline" size="sm">
                                                            <Link href="/submit#badge-info">View Badge Instructions</Link>
                                                        </Button>
                                                        {submission.hasBadge && !submission.badgeVerified && (
                                                            <span className="text-sm text-muted-foreground">
                                                                Badge detected but not yet verified by admin
                                                            </span>
                                                        )}
                                                    </div>
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </>
                                )}

                                {/* Breadcrumb Navigation */}
                                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                        Home
                                    </Link>
                                    <span>›</span>
                                    {category && (
                                        <>
                                            <Link
                                                href={`/c/${category.slug}`}
                                                className="hover:text-foreground transition-colors"
                                            >
                                                {category.name}
                                            </Link>
                                            <span>›</span>
                                        </>
                                    )}
                                    <span className="text-foreground">{submission.title}</span>
                                </nav>

                                {/* Header with Logo and Title */}
                                <div className="flex items-start gap-4">
                                    {/* Logo */}
                                    <div className="flex-shrink-0">
                                        {submission.logo ? (
                                            <div className="relative h-16 w-16 overflow-hidden rounded-xl border bg-white flex items-center justify-center">
                                                <img
                                                    src={submission.logo}
                                                    alt={`${submission.title} logo`}
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
                                                {submission.title}
                                            </h1>
                                            {/* Pricing Badge */}
                                            <Badge
                                                variant={
                                                    submission.pricingType === "Free" ? "default" :
                                                        submission.pricingType === "Freemium" ? "secondary" :
                                                            "outline"
                                                }
                                                className="text-sm"
                                            >
                                                {submission.pricingType || "Free"}
                                            </Badge>
                                        </div>
                                        {/* Tagline - below title */}
                                        {submission.tagline && (
                                            <p className="text-lg text-muted-foreground leading-relaxed">
                                                {submission.tagline}
                                            </p>
                                        )}
                                    </div>

                                    {/* Visit Button - aligned with logo */}
                                    <div className="flex-shrink-0">
                                        <Button asChild size="lg" className="gap-2">
                                            <Link
                                                href={getBookmarkLink(submission.url, isDofollow)}
                                                target="_blank"
                                                rel={getBookmarkRel(isDofollow)}
                                            >
                                                Visit
                                                <ExternalLink className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>

                                {/* Cover Image */}
                                {submission.cover && (
                                    <div className="overflow-hidden rounded-xl border bg-muted max-w-3xl">
                                        <img
                                            src={submission.cover}
                                            alt={`${submission.title} preview`}
                                            className="w-full h-auto object-cover"
                                            style={{ maxHeight: '400px' }}
                                        />
                                    </div>
                                )}

                                {/* Description (detailed content from description field) */}
                                {submission.description && (
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
                                            {submission.description}
                                        </Markdown>
                                    </div>
                                )}

                                {/* Why do startups need this tool? */}
                                {submission.whyStartups && (
                                    <div className="space-y-4">
                                        <h2 className="text-2xl font-bold">Why do startups need this tool?</h2>
                                        <div className="prose prose-gray max-w-none dark:prose-invert">
                                            <Markdown>{submission.whyStartups}</Markdown>
                                        </div>
                                    </div>
                                )}

                                {/* Alternatives */}
                                {submission.alternatives && (
                                    <div className="space-y-4">
                                        <h2 className="text-2xl font-bold">{submission.title} Alternatives</h2>
                                        <div className="flex flex-wrap gap-2">
                                            {submission.alternatives.split(',').map((alt, index) => (
                                                <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                                                    {alt.trim()}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Sidebar */}
                            <aside className="hidden xl:block w-80 flex-shrink-0">
                                <div className="sticky top-8">
                                    {/* Submit Your Tool Card */}
                                    <div className="rounded-xl border bg-card p-6 space-y-4">
                                        <h3 className="font-semibold text-lg">Submit Your Tool</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Get featured on Findly Tools and reach thousands of potential users
                                        </p>
                                        <Button asChild className="w-full">
                                            <Link href="/submit">Submit Now</Link>
                                        </Button>
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
