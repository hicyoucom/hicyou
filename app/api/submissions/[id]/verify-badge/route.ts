
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyBadge } from "@/lib/badge-verify";
import { getSession } from "@/lib/get-session";
import { isAdminEmail } from "@/lib/admin-auth";
import { checkActionRateLimit } from "@/lib/rate-limit";

const MAX_VERIFICATIONS_PER_HOUR = 20;
const VERIFICATION_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const id = parseInt(params.id);
        if (isNaN(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        // 1. Auth Check (Must be logged in)
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user;

        // 2. Get Submission
        const submissionConfig = await db
            .select()
            .from(submissions)
            .where(eq(submissions.id, id))
            .limit(1);

        if (submissionConfig.length === 0) {
            return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        }

        const submission = submissionConfig[0];

        // 3. Ownership Check (Only owner or admin can verify)
        const isOwner = submission.userId === user.id;
        const isAdmin = isAdminEmail(user.email);
        if (!isOwner && !isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const rateLimit = await checkActionRateLimit(
            "submission-verify-badge",
            user.id,
            MAX_VERIFICATIONS_PER_HOUR,
            VERIFICATION_WINDOW_MS,
        );
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "Too many verification attempts. Please try again later." },
                { status: 429, headers: { "Retry-After": "3600" } },
            );
        }

        // 4. Verify Badge
        const isVerified = await verifyBadge(submission.url);

        if (isVerified) {
            // Update DB
            await db
                .update(submissions)
                .set({
                    badgeVerified: true,
                    badgeVerifiedAt: new Date(),
                    isDofollow: true, // Enable Dofollow when a published bookmark is created.
                    hasBadge: true,
                })
                .where(eq(submissions.id, id));

            return NextResponse.json({
                success: true,
                verified: true,
                message: "Badge verified successfully! A Dofollow link will be used if this submission is published.",
            });
        } else {
            return NextResponse.json({
                success: false,
                verified: false,
                message: "Badge not found. Please check your implementation and try again.",
            });
        }

    } catch (error) {
        logger.error("Badge verification error:", error);
        return NextResponse.json(
            { error: "Verification failed" },
            { status: 500 }
        );
    }
}
