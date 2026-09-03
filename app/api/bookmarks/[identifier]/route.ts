import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { bookmarks } from "@/db/schema";
import { eq, or, and, isNull, type SQL } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { MAX_BOOKMARK_TITLE_LENGTH } from "@/lib/bookmark-limits";
import { z } from "zod";
import {
    getCategoryAssignmentsForBookmarkIds,
} from "@/lib/data";
import {
    normalizeCategorySelection,
    replaceBookmarkCategories,
} from "@/lib/category-assignments";
import { normalizeHttpUrl, UrlValidationError } from "@/lib/url-validator";

const idSchema = z.coerce.number().int().positive();

function tryParseId(raw: string): number | null {
    const r = idSchema.safeParse(raw);
    return r.success ? r.data : null;
}

// Identifier may be a numeric id, the full URL, or the slug — the admin UI
// reaches the route via whichever is most convenient at the callsite.
//
// When the identifier parses as a positive integer we treat it as the id
// EXCLUSIVELY: a slug like "42" is legal at the schema level (text NOT NULL
// UNIQUE), so OR-ing id|slug for a numeric input would silently pull the
// wrong row when both id=42 and slug="42" exist. Url/slug only apply for
// non-numeric inputs.
function bookmarkWhere(identifier: string): SQL {
    // App Router params are already decoded. Decoding again corrupts valid
    // identifiers containing a literal percent escape (for example `%25`).
    const id = tryParseId(identifier);
    if (id !== null) return eq(bookmarks.id, id);
    return or(eq(bookmarks.url, identifier), eq(bookmarks.slug, identifier))!;
}

const bookmarkPatchSchema = z.object({
    url: z.string().url().optional(),
    title: z.string().max(MAX_BOOKMARK_TITLE_LENGTH).optional(),
    slug: z.string().optional(),
    description: z.string().nullable().optional(),
    categoryId: z.number().int().nullable().optional(),
    categoryIds: z.array(z.number().int().positive()).max(3).optional(),
    overview: z.string().nullable().optional(),
    favicon: z.string().nullable().optional(),
    screenshot: z.string().nullable().optional(),
    ogImage: z.string().nullable().optional(),
    ogTitle: z.string().nullable().optional(),
    ogDescription: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    tags: z.string().nullable().optional(),
    isArchived: z.boolean().optional(),
    isFavorite: z.boolean().optional(),
    isDofollow: z.boolean().optional(),
    search_results: z.string().nullable().optional(),
    keyFeatures: z.any().optional(),
    useCases: z.any().optional(),
    faqs: z.any().optional(),
    whyStartups: z.string().nullable().optional(),
    alternatives: z.string().nullable().optional(),
});

// Admin-only single-row read. Returns the full bookmark shape including
// admin fields (`notes`, `isArchived`, …) so the admin UI can show them.
// Without this gate, anyone iterating slugs/ids could rebuild the full
// admin row set one row at a time — the same leak the list endpoint had.
export async function GET(request: Request, props: { params: Promise<{ identifier: string }> }) {
    const params = await props.params;
    const auth = await requireAdmin();
    if (!auth.ok) {
        return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
    }
    try {
        const rows = await db
            .select()
            .from(bookmarks)
            .where(bookmarkWhere(params.identifier))
            .limit(1);

        if (rows.length === 0) {
            return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
        }

        const categoryMap = await getCategoryAssignmentsForBookmarkIds(
            [rows[0].id],
            { includeInactive: true },
        );
        return NextResponse.json({
            ...rows[0],
            categories: categoryMap[rows[0].id] ?? [],
        }, {
            headers: { "Cache-Control": "private, no-store" },
        });
    } catch (error) {
        logger.error("Error fetching bookmark:", error);
        return NextResponse.json(
            { error: "Failed to fetch bookmark" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ identifier: string }> }) {
    const params = await props.params;
    try {
        const auth = await requireAdmin();
        if (!auth.ok) {
            return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
        }

        // Soft delete: set deleted_at (+ bump updated_at) instead of a physical
        // DELETE, so the public API's /api/v1/changes can propagate the removal
        // to downstream consumers. Public/admin reads filter on deleted_at IS NULL.
        const now = new Date();
        const deleted = await db
            .update(bookmarks)
            .set({ deletedAt: now, status: "archived", isArchived: true, updatedAt: now })
            .where(and(bookmarkWhere(params.identifier), isNull(bookmarks.deletedAt)))
            .returning();

        if (deleted.length === 0) {
            return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
        }

        logAdminAction({
            actorEmail: auth.email,
            action: "bookmark.delete",
            request,
            status: 200,
            targetType: "bookmark",
            targetId: deleted[0].id,
            metadata: { url: deleted[0].url, slug: deleted[0].slug, title: deleted[0].title },
        });

        revalidateTag(CACHE_TAGS.bookmarks, { expire: 0 });

        return NextResponse.json({ message: "Bookmark deleted successfully" });
    } catch (error) {
        logger.error("Error deleting bookmark:", error);
        return NextResponse.json(
            { error: "Failed to delete bookmark" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request, props: { params: Promise<{ identifier: string }> }) {
    const params = await props.params;
    try {
        const auth = await requireAdmin();
        if (!auth.ok) {
            return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
        }

        const bodyParse = bookmarkPatchSchema.safeParse(await request.json());
        if (!bodyParse.success) {
            return NextResponse.json({ error: "Invalid body", details: bodyParse.error.flatten() }, { status: 400 });
        }

        const { categoryIds: requestedCategoryIds, categoryId, ...fields } = bodyParse.data;
        if (fields.url !== undefined) {
            try {
                fields.url = normalizeHttpUrl(fields.url);
            } catch (error) {
                if (error instanceof UrlValidationError) {
                    return NextResponse.json({ error: error.message }, { status: 400 });
                }
                throw error;
            }
        }
        const shouldReplaceCategories =
            requestedCategoryIds !== undefined || categoryId !== undefined;
        const normalizedCategoryIds = shouldReplaceCategories
            ? normalizeCategorySelection(
                categoryId,
                requestedCategoryIds ?? [],
            )
            : null;
        const updateData = {
            ...fields,
            ...(shouldReplaceCategories
                ? { categoryId: normalizedCategoryIds?.[0] ?? null }
                : {}),
            updatedAt: new Date(),
        };

        const result = await db.transaction(async (tx) => {
            const rows = await tx
                .update(bookmarks)
                .set(updateData)
                .where(bookmarkWhere(params.identifier))
                .returning();
            if (rows[0] && normalizedCategoryIds) {
                await replaceBookmarkCategories(tx, rows[0].id, normalizedCategoryIds, {
                    source: "manual",
                    allowDraft: true,
                });
            }
            return rows;
        });

        if (result.length === 0) {
            return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
        }

        logAdminAction({
            actorEmail: auth.email,
            action: "bookmark.update",
            request,
            status: 200,
            targetType: "bookmark",
            targetId: result[0].id,
            metadata: { fields: Object.keys(bodyParse.data) },
        });

        revalidateTag(CACHE_TAGS.bookmarks, { expire: 0 });

        return NextResponse.json({ message: "Bookmark updated successfully" });
    } catch (error) {
        logger.error("Error updating bookmark:", error);
        return NextResponse.json(
            { error: "Failed to update bookmark" },
            { status: 500 }
        );
    }
}
