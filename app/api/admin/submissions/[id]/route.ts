import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { submissions, bookmarks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/mail";
import { SubmissionApprovedEmail } from "@/components/emails/submission-approved";
import { SubmissionRejectedEmail } from "@/components/emails/submission-rejected";
import { generateUniqueSlug } from "@/lib/slug";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getSubmissionCategorySelections,
  replaceBookmarkCategories,
} from "@/lib/category-assignments";

const idSchema = z.coerce.number().int().positive();

const patchBodySchema = z.object({
  status: z.enum(["pending", "verified", "published", "rejected"]).optional(),
  isDofollow: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: auth.status },
      );
    }

    const idParse = idSchema.safeParse(params.id);
    if (!idParse.success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const id = idParse.data;

    const bodyParse = patchBodySchema.safeParse(await request.json());
    if (!bodyParse.success) {
      return NextResponse.json(
        { error: "Invalid body", details: bodyParse.error.flatten() },
        { status: 400 },
      );
    }
    const { status, isDofollow } = bodyParse.data;

    // Get the submission first
    const submission = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id))
      .limit(1);

    if (submission.length === 0) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
    }

    const updateData: {
      updatedAt: Date;
      status?: typeof status;
      isDofollow?: boolean;
    } = {
      updatedAt: new Date(),
    };

    if (status !== undefined) {
      updateData.status = status;
    }

    if (isDofollow !== undefined) {
      updateData.isDofollow = isDofollow;
    }

    // If approved (published), use transaction for atomicity
    if (status === "published") {
      const sub = submission[0];

      // Generate unique slug
      const newSlug = await generateUniqueSlug(sub.title);

      // Use transaction; return the actual slug used for the email
      const finalSlug = await db.transaction(async (tx) => {
        const categorySelections = await getSubmissionCategorySelections(
          tx,
          [sub.id],
          new Map([[sub.id, sub.categoryId]]),
        );
        const categoryIds = categorySelections.get(sub.id) ?? [];
        // Update submission status
        await tx
          .update(submissions)
          .set(updateData)
          .where(eq(submissions.id, id));

        // Check if bookmark already exists
        const existingBookmark = await tx
          .select()
          .from(bookmarks)
          .where(eq(bookmarks.url, sub.url))
          .limit(1);

        if (existingBookmark.length === 0) {
          // Create bookmark from submission
          const [createdBookmark] = await tx
            .insert(bookmarks)
            .values({
              url: sub.url,
              title: sub.title,
              slug: newSlug,
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
              isDofollow:
                isDofollow !== undefined ? isDofollow : sub.isDofollow,
              keyFeatures: sub.keyFeatures,
              useCases: sub.useCases,
              faqs: sub.faqs,
            })
            .returning({ id: bookmarks.id });
          await replaceBookmarkCategories(tx, createdBookmark.id, categoryIds, {
            source: "submission",
          });
          return newSlug;
        } else {
          // Update existing bookmark
          await tx
            .update(bookmarks)
            .set({
              title: sub.title,
              description: sub.tagline,
              categoryId: sub.categoryId || existingBookmark[0].categoryId,
              favicon: sub.logo || existingBookmark[0].favicon,
              screenshot: sub.cover || existingBookmark[0].screenshot,
              overview: sub.description || existingBookmark[0].overview,
              whyStartups: sub.whyStartups || existingBookmark[0].whyStartups,
              alternatives:
                sub.alternatives || existingBookmark[0].alternatives,

              ogImage: sub.cover || existingBookmark[0].ogImage,
              isDofollow:
                isDofollow !== undefined
                  ? isDofollow
                  : sub.isDofollow || existingBookmark[0].isDofollow,
              keyFeatures: sub.keyFeatures || existingBookmark[0].keyFeatures,
              useCases: sub.useCases || existingBookmark[0].useCases,
              faqs: sub.faqs || existingBookmark[0].faqs,
              updatedAt: new Date(),
              isArchived: false,
            })
            .where(eq(bookmarks.id, existingBookmark[0].id));
          if (categoryIds.length > 0) {
            await replaceBookmarkCategories(
              tx,
              existingBookmark[0].id,
              categoryIds,
              {
                source: "submission",
              },
            );
          }
          return existingBookmark[0].slug; // Keep existing slug for SEO
        }
      });

      // Send Email: Submission Approved
      if (sub.submitterEmail) {
        const subUserName = sub.submitterName || "User";
        logger.info(
          `🚀 Starting approval email send for submission ${sub.id} to ${sub.submitterEmail}`,
        );
        try {
          const result = await sendEmail({
            to: sub.submitterEmail,
            subject: `🎉 Your submission is Live: ${sub.title}`,
            react: SubmissionApprovedEmail({
              userName: subUserName,
              submissionTitle: sub.title,
              submissionUrl: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://hicyou.com"}/${finalSlug}`,
            }),
          });
          if (result.success) {
            logger.info(
              `🏁 Approval email sent for submission ${sub.id} (id: ${result.id})`,
            );
          } else {
            logger.error(
              `❌ Approval email failed for submission ${sub.id}:`,
              result.error,
            );
          }
        } catch (err) {
          logger.error("❌ Failed to await sending email:", err);
        }
      } else {
        logger.warn(
          `⚠️ No submitter email found for submission ${sub.id}, skipping email.`,
        );
      }
    } else {
      // Non-publish updates (rejected, or other status changes)
      await db
        .update(submissions)
        .set(updateData)
        .where(eq(submissions.id, id));

      if (status === "rejected") {
        const sub = submission[0];
        if (sub.submitterEmail) {
          const subUserName = sub.submitterName || "User";
          await sendEmail({
            to: sub.submitterEmail,
            subject: `Update regarding your submission: ${sub.title}`,
            react: SubmissionRejectedEmail({
              userName: subUserName,
              submissionTitle: sub.title,
            }),
          });
        }
      }
    }

    logAdminAction({
      actorEmail: auth.email,
      action:
        status === "published"
          ? "submission.approve"
          : status === "rejected"
            ? "submission.reject"
            : "submission.update",
      request,
      status: 200,
      targetType: "submission",
      targetId: id,
      metadata: { status, isDofollow },
    });
    if (status === "published") {
      revalidateTag(CACHE_TAGS.bookmarks, { expire: 0 });
      revalidateTag(CACHE_TAGS.categories, { expire: 0 });
    }

    return NextResponse.json({
      success: true,
      message: "Submission updated successfully",
    });
  } catch (error) {
    logger.error("Update submission error:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 },
    );
  }
}

// GET single submission for detail view
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: auth.status },
      );
    }

    const idParse = idSchema.safeParse(params.id);
    if (!idParse.success) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const id = idParse.data;
    const submission = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id))
      .limit(1);

    if (submission.length === 0) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      submission: submission[0],
    });
  } catch (error) {
    logger.error("Get submission error:", error);
    return NextResponse.json(
      { error: "Failed to get submission" },
      { status: 500 },
    );
  }
}
