import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Check admin permission
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
        if (!user || !user.email || !adminEmails.includes(user.email)) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const id = parseInt(params.id);
        const body = await request.json();
        const { status, isDofollow } = body;

        // Get the submission first
        const submission = await db
            .select()
            .from(submissions)
            .where(eq(submissions.id, id))
            .limit(1);

        if (submission.length === 0) {
            return NextResponse.json(
                { error: "Submission not found" },
                { status: 404 }
            );
        }

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (status !== undefined) {
            updateData.status = status;
        }

        if (isDofollow !== undefined) {
            updateData.isDofollow = isDofollow;
        }

        await db
            .update(submissions)
            .set(updateData)
            .where(eq(submissions.id, id));

        // If approved (published), create a bookmark
        if (status === "published") {
            const { bookmarks } = await import("@/db/schema");
            const sub = submission[0];

            // Generate slug from title
            const slug = sub.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            // Check if bookmark already exists
            const existingBookmark = await db
                .select()
                .from(bookmarks)
                .where(eq(bookmarks.url, sub.url))
                .limit(1);

            if (existingBookmark.length === 0) {
                // Create bookmark from submission
                await db.insert(bookmarks).values({
                    url: sub.url,
                    title: sub.title,
                    slug: slug,
                    description: sub.tagline,
                    categoryId: sub.categoryId,
                    favicon: sub.logo,
                    screenshot: sub.cover,
                    overview: sub.description,
                    whyStartups: sub.whyStartups,
                    alternatives: sub.alternatives,
                    pricingType: sub.pricingType || "Paid",
                    ogImage: sub.cover,
                    ogTitle: sub.title,
                    ogDescription: sub.tagline,
                    isDofollow: isDofollow !== undefined ? isDofollow : sub.isDofollow,
                    keyFeatures: sub.keyFeatures,
                    useCases: sub.useCases,
                    faqs: sub.faqs,
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: "Submission updated successfully",
        });
    } catch (error) {
        console.error("Update submission error:", error);
        return NextResponse.json(
            { error: "Failed to update submission" },
            { status: 500 }
        );
    }
}

// GET single submission for detail view
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Check admin permission
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
        if (!user || !user.email || !adminEmails.includes(user.email)) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const id = parseInt(params.id);
        const submission = await db
            .select()
            .from(submissions)
            .where(eq(submissions.id, id))
            .limit(1);

        if (submission.length === 0) {
            return NextResponse.json(
                { error: "Submission not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            submission: submission[0],
        });
    } catch (error) {
        console.error("Get submission error:", error);
        return NextResponse.json(
            { error: "Failed to get submission" },
            { status: 500 }
        );
    }
}
