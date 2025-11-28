import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { ids, action } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: "Invalid submission IDs" },
                { status: 400 }
            );
        }

        if (action === "approve") {
            // Get all submissions first
            const submissionsToApprove = await db
                .select()
                .from(submissions)
                .where(inArray(submissions.id, ids));

            // Batch approve: set status to published, dofollow defaults to false
            await db
                .update(submissions)
                .set({
                    status: "published",
                    isDofollow: false,
                    updatedAt: new Date(),
                })
                .where(inArray(submissions.id, ids));

            // Create bookmarks for each approved submission
            const { bookmarks } = await import("@/db/schema");

            for (const sub of submissionsToApprove) {
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
                        isDofollow: false, // Default to false for batch approve
                        keyFeatures: sub.keyFeatures,
                        useCases: sub.useCases,
                        faqs: sub.faqs,
                    });
                }
            }

            return NextResponse.json({
                success: true,
                message: `Approved ${ids.length} submissions`,
            });
        } else if (action === "reject") {
            // Batch reject
            await db
                .update(submissions)
                .set({
                    status: "rejected",
                    updatedAt: new Date(),
                })
                .where(inArray(submissions.id, ids));

            return NextResponse.json({
                success: true,
                message: `Rejected ${ids.length} submissions`,
            });
        } else {
            return NextResponse.json(
                { error: "Invalid action" },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Batch operation error:", error);
        return NextResponse.json(
            { error: "Batch operation failed" },
            { status: 500 }
        );
    }
}
