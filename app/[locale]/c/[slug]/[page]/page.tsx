
import React from "react";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";

// Cached for 1h; mutations invalidate the relevant cache tag (see lib/actions/).
export const revalidate = 3600;

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

type Props = {
    params: Promise<{ slug: string; page: string; locale: Locale }>;
    searchParams: Promise<{ search?: string }>;
};

export async function generateMetadata(
    { params }: Props,
): Promise<Metadata> {
    const { slug, page: pageStr } = await params;
    const category = await getCategoryBySlug(slug);
    const page = Number(pageStr);

    if (!category || isNaN(page) || page < 1) {
        return {
            title: "Not Found",
        };
    }

    return {
        title: `${category.name} - Page ${page} | HiCyou - Free Open Source Directory`,
        description: category.description || `Discover the best ${category.name} tools to boost your productivity`,
        alternates: {
            canonical: `/c/${slug}/${page}`,
        },
        openGraph: {
            title: `${category.name} - Page ${page} | HiCyou - Free Open Source Directory`,
            description: category.description || `Discover the best ${category.name} tools to boost your productivity`,
            url: `/c/${slug}/${page}`,
        },
    };
}

export default async function CategoryPaginationPage({ params, searchParams }: Props) {
    const { slug, page: pageStr, locale } = await params;
    const resolvedSearchParams = await searchParams;
    const page = Number(pageStr);

    if (isNaN(page) || page < 1) {
        notFound();
    }

    if (page === 1) {
        const query = resolvedSearchParams.search
            ? `?${new URLSearchParams({ search: resolvedSearchParams.search })}`
            : "";
        redirect({ href: `/c/${slug}${query}`, locale });
    }

    const tc = await getTranslations('common');

    // Resolve the category first; its id drives the SQL-side bookmark query.
    const category = await getCategoryBySlugTranslated(slug, locale);
    if (!category) {
        notFound();
    }

    // SQL-side filter + pagination + count, matching /c/[slug]. Cost scales
    // with the category, not the whole bookmark table.
    const [{ bookmarks: pageBookmarks, total }, categories] = await Promise.all([
        getBookmarksByCategory(category.id, {
            search: resolvedSearchParams.search,
            page,
            pageSize: 30,
        }),
        getAllCategoriesTranslated(locale),
    ]);

    const totalPages = Math.ceil(total / 30);

    if (page > totalPages) {
        notFound();
    }

    // Apply translations — applyTranslations returns clones, so reassign
    // instead of relying on the legacy in-place mutate pattern.
    let paginatedBookmarks = pageBookmarks;
    if (locale !== "en") {
        const tMap = await getTranslationsForEntities("bookmark", pageBookmarks.map(b => b.id), locale);
        paginatedBookmarks = pageBookmarks.map((b) => applyTranslations(b, tMap));
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
                                    <Badge variant="outline" className="px-3 py-1 text-xs font-medium rounded-full">
                                        Page {page} of {totalPages}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Bookmarks Grid */}
                        <BookmarkGrid>
                            {paginatedBookmarks.map((bookmark) => (
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

                        <div className="mt-8">
                            <CategoryPagination
                                currentPage={page}
                                totalPages={totalPages}
                                basePath={`/c/${slug}`}
                            />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
