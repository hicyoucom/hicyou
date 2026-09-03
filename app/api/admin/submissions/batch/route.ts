import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { submissions, bookmarks } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { sendEmail } from "@/lib/mail";
import { SubmissionApprovedEmail } from "@/components/emails/submission-approved";
import { SubmissionRejectedEmail } from "@/components/emails/submission-rejected";
import { reserveUniqueSlugs } from "@/lib/slug";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getSubmissionCategorySelections,
  replaceBookmarkCategories,
} from "@/lib/category-assignments";

const batchSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
  action: z.enum(["approve", "reject"]),
});

// Send emails with bounded concurrency — up to 200 serial sends can blow the
// function's maxDuration, while unbounded Promise.all can trip the provider.
async function sendEmailsBatched(
  jobs: (() => Promise<unknown>)[],
  chunkSize = 10,
) {
  for (let i = 0; i < jobs.length; i += chunkSize) {
    await Promise.all(
      jobs
        .slice(i, i + chunkSize)
        .map((job) =>
          job().catch((e) =>
            logger.error("Failed to send submission email", e),
          ),
        ),
    );
  }
}

function revalidateDirectoryCaches() {
  try {
    revalidateTag(CACHE_TAGS.bookmarks, { expire: 0 });
    revalidateTag(CACHE_TAGS.categories, { expire: 0 });
  } catch (error) {
    // The database transaction has already committed at this point. A
    // cache-store failure must not turn a successful approval into a 500
    // (and encourage the client to retry the same mutation).
    logger.error(
      "Failed to revalidate directory caches after batch approval",
      error,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: auth.status },
      );
    }

    const parsed = batchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { ids, action } = parsed.data;

    if (action === "approve") {
      // Get all submissions first
      const submissionsToApprove = await db
        .select()
        .from(submissions)
        .where(inArray(submissions.id, ids));

      // Reserve unique slugs before the transaction (one collision query
      // for the whole batch instead of up to 100 per submission).
      const slugs = await reserveUniqueSlugs(
        submissionsToApprove.map((s) => s.title),
      );
      const slugMap = new Map<number, string>();
      submissionsToApprove.forEach((sub, i) => slugMap.set(sub.id, slugs[i]));

      // Single transaction (all-or-nothing, as before); returns a map of
      // submission id -> final slug used.
      const finalSlugMap = new Map<number, string>();
      await db.transaction(async (tx) => {
        const categorySelections = await getSubmissionCategorySelections(
          tx,
          submissionsToApprove.map((sub) => sub.id),
          new Map(submissionsToApprove.map((sub) => [sub.id, sub.categoryId])),
        );
        // Batch approve: one UPDATE for all submissions, preserving
        // each submission's isDofollow (copied onto the bookmark below).
        await tx
          .update(submissions)
          .set({
            status: "published",
            updatedAt: new Date(),
          })
          .where(
            inArray(
              submissions.id,
              submissionsToApprove.map((s) => s.id),
            ),
          );

        // One existence check for all URLs instead of one per row.
        const existingBookmarks = submissionsToApprove.length
          ? await tx
              .select()
              .from(bookmarks)
              .where(
                inArray(
                  bookmarks.url,
                  submissionsToApprove.map((s) => s.url),
                ),
              )
          : [];
        const existingByUrl = new Map(existingBookmarks.map((b) => [b.url, b]));

        // Partition by whether a bookmark already exists. Submission
        // URLs are DB-unique (submissions_url_unique), so toInsert
        // can never contain duplicate URLs within a batch.
        const toInsert = submissionsToApprove.filter(
          (sub) => !existingByUrl.has(sub.url),
        );
        const toMerge = submissionsToApprove.filter((sub) =>
          existingByUrl.has(sub.url),
        );

        if (toInsert.length > 0) {
          const insertedBookmarks = await tx
            .insert(bookmarks)
            .values(
              toInsert.map((sub) => ({
                url: sub.url,
                title: sub.title,
                slug: slugMap.get(sub.id)!,
                description: sub.tagline,
                categoryId: sub.categoryId,
                favicon: sub.logo,
                screenshot: sub.cover,
                overview: sub.description,
                whyStartups: sub.whyStartups,
                alternatives: sub.alternatives,

                ogImage: sub.cover,
                ogTitle: sub.title,
                ogDescription: sub.tagline,
                isDofollow: sub.isDofollow ?? false,
                keyFeatures: sub.keyFeatures,
                useCases: sub.useCases,
                faqs: sub.faqs,
              })),
            )
            .returning({ id: bookmarks.id, url: bookmarks.url });
          const insertedByUrl = new Map(
            insertedBookmarks.map((bookmark) => [bookmark.url, bookmark.id]),
          );
          for (const sub of toInsert) {
            await replaceBookmarkCategories(
              tx,
              insertedByUrl.get(sub.url)!,
              categorySelections.get(sub.id) ?? [],
              { source: "submission" },
            );
            finalSlugMap.set(sub.id, slugMap.get(sub.id)!);
          }
        }

        // Merge path stays per-row: each update falls back to that
        // row's own existing values, so it can't be batched.
        for (const sub of toMerge) {
          const existing = existingByUrl.get(sub.url)!;
          await tx
            .update(bookmarks)
            .set({
              title: sub.title,
              description: sub.tagline,
              categoryId: sub.categoryId || existing.categoryId,
              favicon: sub.logo || existing.favicon,
              screenshot: sub.cover || existing.screenshot,
              overview: sub.description || existing.overview,
              whyStartups: sub.whyStartups || existing.whyStartups,
              alternatives: sub.alternatives || existing.alternatives,

              ogImage: sub.cover || existing.ogImage,
              keyFeatures: sub.keyFeatures || existing.keyFeatures,
              useCases: sub.useCases || existing.useCases,
              faqs: sub.faqs || existing.faqs,
              updatedAt: new Date(),
              isArchived: false,
            })
            .where(eq(bookmarks.id, existing.id));
          const categoryIds = categorySelections.get(sub.id) ?? [];
          if (categoryIds.length > 0) {
            await replaceBookmarkCategories(tx, existing.id, categoryIds, {
              source: "submission",
            });
          }
          finalSlugMap.set(sub.id, existing.slug);
        }
      });

      // Send emails (Await to ensure Vercel doesn't kill the process)
      const appUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://hicyou.com";
      await sendEmailsBatched(
        submissionsToApprove
          .filter((sub) => sub.submitterEmail)
          .map((sub) => () => {
            const emailSlug = finalSlugMap.get(sub.id) || slugMap.get(sub.id)!;
            return sendEmail({
              to: sub.submitterEmail!,
              subject: `🎉 Your submission is Live: ${sub.title}`,
              react: SubmissionApprovedEmail({
                userName: sub.submitterName || "User",
                submissionTitle: sub.title,
                submissionUrl: `${appUrl}/${emailSlug}`,
              }),
            });
          }),
      );

      logAdminAction({
        actorEmail: auth.email,
        action: "submission.batch_approve",
        request,
        status: 200,
        targetType: "submission",
        metadata: { ids, count: ids.length },
      });
      revalidateDirectoryCaches();

      return NextResponse.json({
        success: true,
        message: `Approved ${ids.length} submissions`,
      });
    } else {
      // Batch reject
      const submissionsToReject = await db
        .update(submissions)
        .set({
          status: "rejected",
          updatedAt: new Date(),
        })
        .where(inArray(submissions.id, ids))
        .returning();

      // Send emails (Await to ensure Vercel doesn't kill the process)
      await sendEmailsBatched(
        submissionsToReject
          .filter((sub) => sub.submitterEmail)
          .map(
            (sub) => () =>
              sendEmail({
                to: sub.submitterEmail!,
                subject: `Update regarding your submission: ${sub.title}`,
                react: SubmissionRejectedEmail({
                  userName: sub.submitterName || "User",
                  submissionTitle: sub.title,
                }),
              }),
          ),
      );

      logAdminAction({
        actorEmail: auth.email,
        action: "submission.batch_reject",
        request,
        status: 200,
        targetType: "submission",
        metadata: { ids, count: ids.length },
      });

      return NextResponse.json({
        success: true,
        message: `Rejected ${ids.length} submissions`,
      });
    }
  } catch (error) {
    logger.error("Batch operation error:", error);
    return NextResponse.json(
      { error: "Batch operation failed" },
      { status: 500 },
    );
  }
}
