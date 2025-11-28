import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { verifyBadge } from "@/lib/badge-verify";
import { getClientIp } from "@/lib/rate-limit";
import { eq, and, gte, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/submissions
 * Submit a new website
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to submit a website" },
        { status: 401 }
      );
    }

    // Ensure profile exists (fallback in case OAuth callback didn't create it)
    try {
      const { profiles } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");

      const existingProfile = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);

      if (existingProfile.length === 0) {
        await db.insert(profiles).values({
          id: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatarUrl: user.user_metadata?.avatar_url || null,
        });
      }
    } catch (profileError) {
      console.error('Error ensuring profile exists:', profileError);
      // Continue anyway - the error will be caught below if profile is truly missing
    }

    const body = await request.json();
    const {
      url,
      title,
      tagline,
      description,
      whyStartups,
      alternatives,
      pricingType,
      categoryId,
      logo,
      cover,
      hasBadge,
      keyFeatures,
      useCases,
      faqs,
    } = body;

    // Get user profile for name
    const { profiles } = await import("@/db/schema");
    const userProfile = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
    const submitterName = userProfile[0]?.fullName || user.user_metadata?.full_name || user.user_metadata?.name || "Anonymous";
    const submitterEmail = user.email || "";

    // Get client IP
    const clientIp = getClientIp(request);

    // Check daily submission limit (5 per user)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const userSubmissions = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(
        and(
          eq(submissions.userId, user.id),
          gte(submissions.createdAt, oneDayAgo)
        )
      );

    const submissionCount = userSubmissions[0]?.count || 0;
    if (submissionCount >= 5) {
      return NextResponse.json(
        { error: "You have reached the daily submission limit (5 websites per day)" },
        { status: 429 }
      );
    }

    // Validate required fields
    if (!url || !title || !tagline || !description || !pricingType || !categoryId || !logo || !cover) {
      return NextResponse.json(
        { error: "All required fields must be filled" },
        { status: 400 }
      );
    }

    // Validate email (from user profile)
    if (!submitterEmail) {
      return NextResponse.json(
        { error: "User email is required. Please update your profile." },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Check if URL already exists
    let existingSubmission;
    try {
      existingSubmission = await db
        .select()
        .from(submissions)
        .where(eq(submissions.url, url))
        .limit(1);
    } catch (dbError) {
      console.error("Database query error:", dbError);
      return NextResponse.json(
        { error: "Database connection failed, please try again later" },
        { status: 503 }
      );
    }

    if (existingSubmission.length > 0) {
      return NextResponse.json(
        { error: "This website has already been submitted" },
        { status: 409 }
      );
    }

    // Determine submission status and dofollow based on badge
    let badgeVerified = false;
    let isDofollow = false;
    let status = "pending";

    if (hasBadge) {
      // Verify badge on the website
      console.log(`Verifying badge for: ${url}`);
      badgeVerified = await verifyBadge(url);

      if (badgeVerified) {
        // Badge verified: will be dofollow + ugc, requires manual review
        isDofollow = true;
        status = "pending"; // Requires manual review
      } else {
        return NextResponse.json(
          {
            error: "Badge not found",
            message: "We couldn't find our badge on your website. Please add the badge and try again, or submit without the badge option.",
            verified: false,
          },
          { status: 400 }
        );
      }
    } else {
      // No badge: will be nofollow with /go/ redirect
      isDofollow = false;
      status = "pending"; // Still requires review
    }

    // Create submission record
    const now = new Date();
    const [newSubmission] = await db
      .insert(submissions)
      .values({
        url,
        title,
        tagline,
        description,
        categoryId: categoryId ? parseInt(categoryId) : null,
        userId: user.id, // Link to user
        whyStartups: whyStartups || null,
        alternatives: alternatives || null,
        pricingType: pricingType || "Paid",
        logo,
        cover,
        submitterEmail,
        submitterName,
        submitterIp: clientIp,
        hasBadge: hasBadge || false,
        badgeVerified,
        badgeVerifiedAt: badgeVerified ? now : null,
        isDofollow,
        status,
        keyFeatures: keyFeatures || [],
        useCases: useCases || [],
        faqs: faqs || [],
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: hasBadge && badgeVerified
          ? "Website submitted successfully with badge verification! Your submission will be reviewed by our team. You'll receive an email once it's approved."
          : "Website submitted successfully! Your submission will be reviewed by our team. You'll receive an email once it's approved.",
        submission: newSubmission,
        remaining: 5 - (submissionCount + 1),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Submission failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/submissions
 * Get submissions list (admin use)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const allSubmissions = status
      ? await db
        .select()
        .from(submissions)
        .where(eq(submissions.status, status))
      : await db.select().from(submissions);

    return NextResponse.json({
      success: true,
      submissions: allSubmissions,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
