import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { verifyBadge } from "@/lib/badge-verify";
import { getClientIp, checkActionRateLimit } from "@/lib/rate-limit";
import { parseHttpUrl } from "@/lib/url-validator";

const MAX_VERIFICATIONS_PER_HOUR = 20;
const VERIFICATION_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST /api/verify-badge
 * Verify if a website contains our badge
 */
export async function POST(request: NextRequest) {
  try {
    // Public endpoint that makes the server fetch arbitrary URLs — cap abuse
    // per client IP (the submit form only needs a handful of attempts).
    const clientIp = getClientIp(request);
    const rl = await checkActionRateLimit("verify-badge", clientIp, MAX_VERIFICATIONS_PER_HOUR, VERIFICATION_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Too many requests. Maximum ${MAX_VERIFICATIONS_PER_HOUR} badge verifications per hour. Please try again later.`,
          verified: false,
          // The submit form reads `message` on failure — without it, a 429
          // would display as "badge not found", which is misleading.
          message: "Too many verification attempts. Please try again in an hour.",
        },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }

    const body: unknown = await request.json().catch(() => null);
    let url: string;
    try {
      if (
        !body ||
        typeof body !== "object" ||
        !("url" in body) ||
        typeof body.url !== "string"
      ) {
        throw new Error("URL is required");
      }
      url = parseHttpUrl(body.url).toString();
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format", verified: false },
        { status: 400 },
      );
    }

    // Verify badge
    const verified = await verifyBadge(url);

    if (verified) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: "Badge verified successfully! This submission is eligible for a Dofollow link if it is published.",
      });
    } else {
      return NextResponse.json({
        success: false,
        verified: false,
        message: "Badge not found on your website. Please add the badge and try again, or submit without badge verification to get a nofollow link.",
      });
    }
  } catch (error) {
    logger.error("Error verifying badge:", error);
    return NextResponse.json(
      {
        error: "Failed to verify badge",
        verified: false,
        message: "An error occurred while verifying the badge. Please try again.",
      },
      { status: 500 }
    );
  }
}
