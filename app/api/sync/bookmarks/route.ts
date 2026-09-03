import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { bookmarks, categories } from "@/db/schema";
import { eq, gt, and, asc, count } from "drizzle-orm";
import { verifyBearerToken } from "@/lib/cron-auth";
import { getCategoryAssignmentsForBookmarkIds } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    // Auth: constant-time Bearer check (fail-closed if SYNC_API_KEY unset).
    if (!verifyBearerToken(request, process.env.SYNC_API_KEY)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const sinceParam = searchParams.get("since");
        const cursorParam = searchParams.get("cursor");
        const limitParam = searchParams.get("limit");

        const limit = Math.min(Math.max(parseInt(limitParam || "100", 10) || 100, 1), 500);
        const cursor = parseInt(cursorParam || "0", 10) || 0;
        const since = sinceParam ? new Date(sinceParam) : null;

        if (since && isNaN(since.getTime())) {
            return NextResponse.json(
                { error: "Invalid 'since' parameter. Use ISO 8601 format." },
                { status: 400 }
            );
        }

        // Build WHERE conditions
        const conditions = [];

        if (since) {
            // Incremental: return all updated items (including archived ones for deletion tracking)
            conditions.push(gt(bookmarks.updatedAt, since));
        } else {
            // Full sync: only non-archived
            conditions.push(eq(bookmarks.isArchived, false));
        }

        if (cursor > 0) {
            conditions.push(gt(bookmarks.id, cursor));
        }

        const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

        // rows / total / categories are independent — issue them together.
        const [rows, [totalResult], allCategories] = await Promise.all([
            // Fetch limit + 1 to determine has_more
            db
                .select({
                    id: bookmarks.id,
                    url: bookmarks.url,
                    title: bookmarks.title,
                    slug: bookmarks.slug,
                    description: bookmarks.description,
                    overview: bookmarks.overview,
                    favicon: bookmarks.favicon,
                    ogImage: bookmarks.ogImage,
                    categoryId: bookmarks.categoryId,
                    categoryName: categories.name,
                    categorySlug: categories.slug,
                    pricingType: bookmarks.pricingType,
                    tags: bookmarks.tags,
                    keyFeatures: bookmarks.keyFeatures,
                    useCases: bookmarks.useCases,
                    faqs: bookmarks.faqs,
                    whyStartups: bookmarks.whyStartups,
                    alternatives: bookmarks.alternatives,
                    isArchived: bookmarks.isArchived,
                    createdAt: bookmarks.createdAt,
                    updatedAt: bookmarks.updatedAt,
                })
                .from(bookmarks)
                .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
                .where(whereClause)
                .orderBy(asc(bookmarks.id))
                .limit(limit + 1),
            // Total count (matching the same filter; kept per-page for the
            // sync consumers' contract)
            db
                .select({ value: count() })
                .from(bookmarks)
                .where(whereClause),
            // Categories (always included for convenience)
            db
                .select({
                    id: categories.id,
                    name: categories.name,
                    slug: categories.slug,
                })
                .from(categories)
                .where(eq(categories.status, "active"))
                .orderBy(asc(categories.sortOrder)),
        ]);

        const hasMore = rows.length > limit;
        const data = hasMore ? rows.slice(0, limit) : rows;
        const nextCursor = hasMore ? data[data.length - 1].id : null;
        const categoryAssignments = await getCategoryAssignmentsForBookmarkIds(
            data.map((row) => row.id),
        );

        // Build bookmark response (add archived flag for incremental sync)
        const bookmarkList = data.map((row) => {
            const item: Record<string, unknown> = {
                id: row.id,
                url: row.url,
                title: row.title,
                slug: row.slug,
                description: row.description,
                overview: row.overview,
                favicon: row.favicon,
                ogImage: row.ogImage,
                categoryId: row.categoryId,
                categoryName: row.categoryName,
                categorySlug: row.categorySlug,
                categories: (categoryAssignments[row.id] ?? []).map((category) => ({
                    id: category.id,
                    name: category.name,
                    slug: category.slug,
                    primary: category.position === 0,
                })),
                pricingType: row.pricingType,
                tags: row.tags,
                keyFeatures: row.keyFeatures,
                useCases: row.useCases,
                faqs: row.faqs,
                whyStartups: row.whyStartups,
                alternatives: row.alternatives,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            };
            if (since && row.isArchived) {
                item.archived = true;
            }
            return item;
        });

        const total = totalResult?.value ?? 0;

        return NextResponse.json({
            success: true,
            meta: {
                total,
                count: bookmarkList.length,
                has_more: hasMore,
                next_cursor: nextCursor,
                synced_at: new Date().toISOString(),
            },
            categories: allCategories,
            bookmarks: bookmarkList,
        });
    } catch (error) {
        logger.error("Sync API error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
