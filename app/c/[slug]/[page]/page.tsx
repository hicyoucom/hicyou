
import React from "react";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Metadata, ResolvingMetadata } from "next";

// Database Imports
import { getAllBookmarks, getAllCategories, getCategoryBySlug } from "@/lib/data";

// Component Imports
import { BookmarkCard } from "@/components/bookmark-card";
import { BookmarkGrid } from "@/components/bookmark-grid";
import { CategorySidebar } from "@/components/category-sidebar";
import { CategoryPagination } from "@/components/category-pagination";
import { TopNav } from "@/components/top-nav";
import { Badge } from "@/components/ui/badge";
import Balancer from "react-wrap-balancer";
import * as LucideIcons from "lucide-react";

type Props = {
    params: { slug: string; page: string };
};

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata,
): Promise<Metadata> {
    const category = await getCategoryBySlug(params.slug);
    const page = Number(params.page);

    if (!category || isNaN(page) || page < 1) {
        return {
            title: "Not Found",
        };
    }

    return {
        title: `${category.name} - Page ${page} | Directory`,
        description: category.description || `Discover the best ${category.name} tools to boost your productivity`,
        alternates: {
            canonical: `/c/${params.slug}/${page}`,
        },
    };
}

export default async function CategoryPaginationPage({ params }: Props) {
    const page = Number(params.page);

    if (isNaN(page) || page < 1) {
        notFound();
    }

    if (page === 1) {
        redirect(`/c/${params.slug}`);
    }

    const [category, bookmarks, categories] = await Promise.all([
        getCategoryBySlug(params.slug),
        getAllBookmarks(),
        getAllCategories(),
    ]);

    if (!category) {
        notFound();
    }

    const filteredBookmarks = bookmarks
        .filter((bookmark) => bookmark.category?.id === category.id);

    const totalPages = Math.ceil(filteredBookmarks.length / 30);

    if (page > totalPages) {
        notFound();
    }

    const paginatedBookmarks = filteredBookmarks.slice((page - 1) * 30, page * 30);

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
                        currentCategorySlug={params.slug}
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
                                    {category.icon && (() => {
                                        const IconComponent = (LucideIcons as any)[category.icon];
                                        return IconComponent ? (
                                            <div
                                                className="flex items-center justify-center w-12 h-12 rounded-xl shadow-lg"
                                                style={{
                                                    backgroundColor: category.color ? `${category.color}15` : 'hsl(var(--primary) / 0.1)',
                                                    color: category.color || 'hsl(var(--primary))'
                                                }}
                                            >
                                                <IconComponent className="w-6 h-6" />
                                            </div>
                                        ) : null;
                                    })()}
                                </div>

                                {/* Category Name */}
                                <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight leading-tight">
                                    <Balancer>
                                        {category.name}
                                    </Balancer>
                                </h1>

                                {/* Category Description */}
                                <p className="text-sm md:text-base text-muted-foreground mb-4 max-w-3xl mx-auto">
                                    <Balancer>
                                        {category.description || `Discover the best ${category.name} tools to boost your productivity`}
                                    </Balancer>
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
                                        {filteredBookmarks.length} {filteredBookmarks.length === 1 ? 'Tool' : 'Tools'}
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
                                        pricingType: bookmark.pricingType,
                                        slug: bookmark.slug,
                                    }}
                                />
                            ))}
                        </BookmarkGrid>

                        <div className="mt-8">
                            <CategoryPagination
                                currentPage={page}
                                totalPages={totalPages}
                                basePath={`/c/${params.slug}`}
                            />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
