import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { bookmarks, submissions } from "@/db/schema";
import { generateUniqueSlug } from "@/lib/slug";
import { eq, and, lte } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";
import {
    getSubmissionCategorySelections,
    replaceBookmarkCategories,
} from "@/lib/category-assignments";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

export const maxDuration = 300; // 5 minutes timeout for Vercel
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (!verifyCronAuth(request)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const results = {
        publish: [] as Array<{
            title?: string;
            status?: "published" | "error";
            error?: string;
        }>,
    };

    try {
        logger.info("Starting Daily Cron Job (Publish Only)...");

        // ==========================================
        // TASK: Publish Scheduled Submissions
        // ==========================================
        logger.info("--- Task: Publishing Scheduled Submissions ---");
        try {
            const now = new Date();
            const readyToPublish = await db
                .select()
                .from(submissions)
                .where(
                    and(
                        eq(submissions.status, "verified"),
                        lte(submissions.publishAt, now)
                    )
                );

            logger.info(`Found ${readyToPublish.length} submissions ready to publish.`);

            for (const submission of readyToPublish) {
                try {
                    const slug = await generateUniqueSlug(submission.title);

                    // Use transaction for atomicity
                    await db.transaction(async (tx) => {
                        const categorySelections = await getSubmissionCategorySelections(
                            tx,
                            [submission.id],
                            new Map([[submission.id, submission.categoryId]]),
                        );
                        const [createdBookmark] = await tx
                            .insert(bookmarks)
                            .values({
                                url: submission.url,
                                title: submission.title,
                                slug: slug,
                                description: submission.description,
                                categoryId: submission.categoryId,
                                isFavorite: false,
                                isArchived: false,
                                keyFeatures: submission.keyFeatures,
                                useCases: submission.useCases,
                                faqs: submission.faqs,
                                whyStartups: submission.whyStartups,
                                alternatives: submission.alternatives,
                                pricingType: submission.pricingType,
                                favicon: submission.logo,
                                ogImage: submission.cover,
                            })
                            .returning({ id: bookmarks.id });
                        await replaceBookmarkCategories(
                            tx,
                            createdBookmark.id,
                            categorySelections.get(submission.id) ?? [],
                            { source: "submission" },
                        );

                        await tx
                            .update(submissions)
                            .set({
                                status: "published",
                                updatedAt: now,
                            })
                            .where(eq(submissions.id, submission.id));
                    });

                    logger.info(`✓ Published: ${submission.title}`);
                    results.publish.push({ title: submission.title, status: "published" });
                } catch (error) {
                    logger.error(`✗ Failed to publish: ${submission.title}`, error);
                    results.publish.push({ title: submission.title, status: "error", error: String(error) });
                }
            }
            if (results.publish.some((item) => item.status === "published")) {
                revalidateTag(CACHE_TAGS.bookmarks, { expire: 0 });
                revalidateTag(CACHE_TAGS.categories, { expire: 0 });
            }
        } catch (error) {
            logger.error("Publish task failed:", error);
            results.publish.push({ error: String(error) });
        }

        return NextResponse.json({ success: true, results });

    } catch (error) {
        logger.error("Cron job failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
