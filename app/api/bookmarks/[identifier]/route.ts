import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { bookmarks } from "@/db/schema";
import { eq, or } from "drizzle-orm";

async function getBookmark(identifier: string) {
    const decodedIdentifier = decodeURIComponent(identifier);
    const id = parseInt(decodedIdentifier);

    // If it's a valid number, try to find by ID first
    if (!isNaN(id)) {
        const byId = await db.select().from(bookmarks).where(eq(bookmarks.id, id)).limit(1);
        if (byId.length > 0) return byId[0];
    }

    // Otherwise (or if not found by ID), try to find by URL
    const byUrl = await db.select().from(bookmarks).where(eq(bookmarks.url, decodedIdentifier)).limit(1);
    if (byUrl.length > 0) return byUrl[0];

    return null;
}

export async function GET(
    request: Request,
    { params }: { params: { identifier: string } }
) {
    try {
        const bookmark = await getBookmark(params.identifier);

        if (!bookmark) {
            return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
        }

        return NextResponse.json(bookmark);
    } catch (error) {
        console.error("Error fetching bookmark:", error);
        return NextResponse.json(
            { error: "Failed to fetch bookmark" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { identifier: string } }
) {
    try {
        const decodedIdentifier = decodeURIComponent(params.identifier);
        const id = parseInt(decodedIdentifier);

        if (!isNaN(id)) {
            // Try delete by ID
            const result = await db.delete(bookmarks).where(eq(bookmarks.id, id)).returning();
            if (result.length > 0) {
                return NextResponse.json({ message: "Bookmark deleted successfully" });
            }
        }

        // Try delete by URL
        await db.delete(bookmarks).where(eq(bookmarks.url, decodedIdentifier));

        return NextResponse.json({ message: "Bookmark deleted successfully" });
    } catch (error) {
        console.error("Error deleting bookmark:", error);
        return NextResponse.json(
            { error: "Failed to delete bookmark" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { identifier: string } }
) {
    try {
        const decodedIdentifier = decodeURIComponent(params.identifier);
        const id = parseInt(decodedIdentifier);
        const body = await request.json();

        // Prepare update data
        const updateData: any = {
            updatedAt: new Date(),
        };

        // Map fields from body to updateData
        const fields = [
            "url", "title", "slug", "description", "categoryId", "overview",
            "favicon", "screenshot", "ogImage", "ogTitle", "ogDescription",
            "notes", "tags", "isArchived", "isFavorite", "isDofollow",
            "search_results", "keyFeatures", "useCases", "faqs",
            "whyStartups", "alternatives", "pricingType"
        ];

        for (const field of fields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        let result;
        if (!isNaN(id)) {
            // Try update by ID
            result = await db
                .update(bookmarks)
                .set(updateData)
                .where(eq(bookmarks.id, id))
                .returning();
        }

        if (!result || result.length === 0) {
            // Try update by URL
            result = await db
                .update(bookmarks)
                .set(updateData)
                .where(eq(bookmarks.url, decodedIdentifier))
                .returning();
        }

        if (!result || result.length === 0) {
            return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Bookmark updated successfully" });
    } catch (error) {
        console.error("Error updating bookmark:", error);
        return NextResponse.json(
            { error: "Failed to update bookmark" },
            { status: 500 }
        );
    }
}
