import { NextRequest, NextResponse } from "next/server";
import { verifyBadge } from "@/lib/badge-verify";

/**
 * POST /api/verify-badge
 * Verify if a website contains our badge
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required", verified: false },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format", verified: false },
        { status: 400 }
      );
    }

    // Verify badge
    const verified = await verifyBadge(url);

    if (verified) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: "Badge verified successfully! Your link will be dofollow + ugc.",
      });
    } else {
      return NextResponse.json({
        success: false,
        verified: false,
        message: "Badge not found on your website. Please add the badge and try again, or submit without badge verification to get a nofollow link.",
      });
    }
  } catch (error) {
    console.error("Error verifying badge:", error);
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

