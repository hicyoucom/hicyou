import { logger } from "@/lib/logger";
import { after, NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  bookmarks,
  categories,
  submissionCategories,
  submissions,
} from "@/db/schema";
import { verifyBadge } from "@/lib/badge-verify";
import { checkActionRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstile, isTurnstileEnabled } from "@/lib/turnstile";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { getSession } from "@/lib/get-session";
import { getAdminEmails, requireAdmin } from "@/lib/admin-auth";
import { normalizeHttpUrl } from "@/lib/url-validator";
import { submissionSchema } from "@/lib/submission-schema";
import { sendEmail } from "@/lib/mail";
import { SubmissionReceivedAdminEmail } from "@/components/emails/submission-received-admin";
import { SubmissionReceivedUserEmail } from "@/components/emails/submission-received-user";
import { replaceSubmissionCategories } from "@/lib/category-assignments";

const MAX_SUBMISSIONS_PER_DAY = 5;
const MAX_SUBMISSION_ATTEMPTS_PER_HOUR = 30;
const SUBMISSION_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST /api/submissions
 * Submit a new website
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to submit a website" },
        { status: 401 },
      );
    }

    const clientIp = getClientIp(request);
    const attemptLimit = await checkActionRateLimit(
      "submission-attempt",
      `${user.id}:${clientIp}`,
      MAX_SUBMISSION_ATTEMPTS_PER_HOUR,
      SUBMISSION_ATTEMPT_WINDOW_MS,
    );
    if (!attemptLimit.allowed) {
      return NextResponse.json(
        { error: "Too many submission attempts. Please try again later." },
        { status: 429 },
      );
    }

    const parsedBody = submissionSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid submission data",
          details: parsedBody.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const {
      url,
      title,
      tagline,
      description,
      whyStartups,
      alternatives,

      categoryId,
      categoryIds,
      logo,
      cover,
      hasBadge,
      keyFeatures,
      useCases,
      faqs,
      turnstileToken,
    } = parsedBody.data;

    // Verify Turnstile token
    if (isTurnstileEnabled()) {
      const turnstileResult = await verifyTurnstile(
        turnstileToken || "",
        clientIp,
      );
      if (!turnstileResult.success) {
        return NextResponse.json(
          { error: turnstileResult.error || "Security verification failed" },
          { status: 403 },
        );
      }
    }

    // Ensure profile exists (fallback in case OAuth callback didn't create it)
    try {
      const { profiles } = await import("@/db/schema");

      // Upsert instead of check-then-insert: two concurrent submissions could
      // both pass the existence check and race on the insert (TOCTOU). ON
      // CONFLICT DO NOTHING makes this idempotent and race-safe.
      await db
        .insert(profiles)
        .values({
          id: user.id,
          email: user.email,
          fullName: user.name || null,
          avatarUrl: user.image || null,
        })
        .onConflictDoNothing({ target: profiles.id });
    } catch (profileError) {
      logger.error("Error ensuring profile exists:", profileError);
      // Continue anyway - the insert below will fail if the profile is missing.
    }

    // Get user profile for name
    const { profiles } = await import("@/db/schema");
    const userProfile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    const submitterName = userProfile[0]?.fullName || user.name || "Anonymous";
    const submitterEmail = user.email || "";

    // Validate email (from user profile)
    if (!submitterEmail) {
      return NextResponse.json(
        { error: "User email is required. Please update your profile." },
        { status: 400 },
      );
    }

    // Validate & normalize URL
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeHttpUrl(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    const categoryExists = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          inArray(categories.id, categoryIds),
          eq(categories.status, "active"),
        ),
      );
    if (categoryExists.length !== categoryIds.length) {
      return NextResponse.json(
        { error: "Selected category does not exist" },
        { status: 400 },
      );
    }

    // Check if URL already exists in submissions or bookmarks
    let existingSubmission;
    try {
      existingSubmission = await db
        .select()
        .from(submissions)
        .where(eq(submissions.url, normalizedUrl))
        .limit(1);

      if (existingSubmission.length === 0) {
        const existingBookmark = await db
          .select({ id: bookmarks.id })
          .from(bookmarks)
          .where(eq(bookmarks.url, normalizedUrl))
          .limit(1);
        if (existingBookmark.length > 0) {
          return NextResponse.json(
            { error: "This website already exists in our directory" },
            { status: 409 },
          );
        }
      }
    } catch (dbError) {
      logger.error("Database query error:", dbError);
      return NextResponse.json(
        { error: "Database connection failed, please try again later" },
        { status: 503 },
      );
    }

    if (existingSubmission.length > 0) {
      return NextResponse.json(
        { error: "This website has already been submitted" },
        { status: 409 },
      );
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [preflightCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(
        and(
          eq(submissions.userId, user.id),
          gte(submissions.createdAt, oneDayAgo),
        ),
      );
    if (Number(preflightCount?.count ?? 0) >= MAX_SUBMISSIONS_PER_DAY) {
      return NextResponse.json(
        {
          error:
            "You have reached the daily submission limit (5 websites per day)",
        },
        { status: 429 },
      );
    }

    // Determine submission status and dofollow based on badge
    let badgeVerified = false;
    let isDofollow = false;
    let status = "pending";

    if (hasBadge) {
      // Verify badge on the website
      logger.info(`Verifying badge for: ${url}`);
      badgeVerified = await verifyBadge(url);

      if (badgeVerified) {
        // Badge verified: will be Dofollow after publication, still requires manual review.
        isDofollow = true;
        status = "pending"; // Requires manual review
      } else {
        return NextResponse.json(
          {
            error: "Badge not found",
            message:
              "We couldn't find our badge on your website. Please add the badge and try again, or submit without the badge option.",
            verified: false,
          },
          { status: 400 },
        );
      }
    } else {
      // No badge: the published listing link uses rel="nofollow".
      isDofollow = false;
      status = "pending"; // Still requires review
    }

    // Serialize the count-and-insert section per user. The transaction-level
    // advisory lock preserves the rolling limit for existing submissions and
    // prevents concurrent requests from all observing the same count.
    const creationResult = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`submission:${user.id}`}))`,
      );

      const [countResult] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(submissions)
        .where(
          and(
            eq(submissions.userId, user.id),
            gte(submissions.createdAt, oneDayAgo),
          ),
        );
      const submissionCount = Number(countResult?.count ?? 0);
      if (submissionCount >= MAX_SUBMISSIONS_PER_DAY) {
        return { submission: null, remaining: 0, duplicate: false } as const;
      }

      const [createdSubmission] = await tx
        .insert(submissions)
        .values({
          url: normalizedUrl,
          title,
          tagline,
          description,
          categoryId,
          userId: user.id,
          whyStartups: whyStartups || null,
          alternatives: alternatives || null,
          logo,
          cover,
          submitterEmail,
          submitterName,
          submitterIp: clientIp,
          hasBadge,
          badgeVerified,
          badgeVerifiedAt: badgeVerified ? now : null,
          isDofollow,
          status,
          keyFeatures,
          useCases,
          faqs,
        })
        // The availability query above improves the common-path response, but
        // it cannot prevent two different users from submitting the same URL
        // concurrently. Let PostgreSQL arbitrate the unique URL and translate
        // the losing request into a stable 409 instead of a generic 500.
        .onConflictDoNothing({ target: submissions.url })
        .returning();

      if (!createdSubmission) {
        return { submission: null, remaining: null, duplicate: true } as const;
      }

      await replaceSubmissionCategories(tx, createdSubmission.id, categoryIds);

      return {
        submission: createdSubmission,
        remaining: MAX_SUBMISSIONS_PER_DAY - submissionCount - 1,
        duplicate: false,
      } as const;
    });

    if (!creationResult.submission) {
      if (creationResult.duplicate) {
        return NextResponse.json(
          { error: "This website has already been submitted" },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error:
            "You have reached the daily submission limit (5 websites per day)",
        },
        { status: 429 },
      );
    }
    const newSubmission = creationResult.submission;

    // Notifications should not hold the mutation response open. Next.js keeps
    // the request scope alive for after() on both Node servers and supported
    // serverless adapters.
    after(async () => {
      const appUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://hicyou.com";
      const notificationJobs = [
        ...getAdminEmails().map((adminEmail) =>
          sendEmail({
            to: adminEmail,
            subject: `[HiCyou] New Submission: ${title}`,
            react: SubmissionReceivedAdminEmail({
              submitterName,
              submitterEmail,
              submissionTitle: title,
              submissionUrl: normalizedUrl,
              adminUrl: `${appUrl}/hi-studio/submissions`,
            }),
          }),
        ),
        sendEmail({
          to: submitterEmail,
          subject: `We received your submission: ${title}`,
          react: SubmissionReceivedUserEmail({
            userName: submitterName,
            submissionTitle: title,
            statusUrl: `${appUrl}/submit/${newSubmission.id}`,
          }),
        }),
      ];

      const notificationResults = await Promise.allSettled(notificationJobs);
      for (const result of notificationResults) {
        if (result.status === "rejected") {
          logger.error("Failed to send submission email:", result.reason);
        }
      }
    });

    return NextResponse.json(
      {
        success: true,
        message:
          hasBadge && badgeVerified
            ? "Website submitted successfully with badge verification! Your submission will be reviewed by our team. You'll receive an email once it's approved."
            : "Website submitted successfully! Your submission will be reviewed by our team. You'll receive an email once it's approved.",
        submission: newSubmission,
        remaining: creationResult.remaining,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error creating submission:", error);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}

/**
 * GET /api/submissions
 * Get submissions list (admin use)
 */
export async function GET(request: NextRequest) {
  try {
    // Admin-only endpoint
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: auth.status },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const allSubmissions = status
      ? await db
          .select()
          .from(submissions)
          .where(eq(submissions.status, status))
      : await db.select().from(submissions);

    const assignmentRows =
      allSubmissions.length > 0
        ? await db
            .select({
              submissionId: submissionCategories.submissionId,
              position: submissionCategories.position,
              id: categories.id,
              name: categories.name,
              slug: categories.slug,
            })
            .from(submissionCategories)
            .innerJoin(
              categories,
              eq(submissionCategories.categoryId, categories.id),
            )
            .where(
              inArray(
                submissionCategories.submissionId,
                allSubmissions.map((submission) => submission.id),
              ),
            )
            .orderBy(
              submissionCategories.submissionId,
              submissionCategories.position,
            )
        : [];
    const categoriesBySubmission = new Map<
      number,
      Array<{ id: number; name: string; slug: string; primary: boolean }>
    >();
    for (const row of assignmentRows) {
      const assigned = categoriesBySubmission.get(row.submissionId) ?? [];
      assigned.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        primary: row.position === 0,
      });
      categoriesBySubmission.set(row.submissionId, assigned);
    }

    return NextResponse.json({
      success: true,
      submissions: allSubmissions.map((submission) => ({
        ...submission,
        categories: categoriesBySubmission.get(submission.id) ?? [],
      })),
    });
  } catch (error) {
    logger.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 },
    );
  }
}
