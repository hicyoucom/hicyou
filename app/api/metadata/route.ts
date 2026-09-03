import { NextResponse } from "next/server";
import { getSession } from "@/lib/get-session";
import { logger } from "@/lib/logger";
import { canUseManualMetadataEntry } from "@/lib/fetch-metadata";
import { fetchSubmissionMetadata } from "@/lib/submission-metadata-fetch";
import { getSubmissionUrlAvailability } from "@/lib/data/submission-url-availability";
import { normalizeHttpUrl, UrlValidationError } from "@/lib/url-validator";
import { checkActionRateLimit } from "@/lib/rate-limit";
import {
  createManualSubmissionMetadata,
  type SubmissionMetadata,
} from "@/lib/submission-prefill";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FETCHES_PER_HOUR = 20;
const FETCH_WINDOW_MS = 60 * 60 * 1000;
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

function duplicateResponse(
  availability: "already_submitted" | "already_listed",
) {
  return NextResponse.json(
    {
      error:
        availability === "already_listed"
          ? "This website already exists in our directory"
          : "This website has already been submitted",
      availability,
    },
    { status: 409, headers: NO_STORE_HEADERS },
  );
}

/**
 * URL-first submission preflight. It is intentionally authenticated: this
 * route causes server-side network requests and is only needed by /submit.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: "You must be logged in to prepare a submission" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const rateLimit = await checkActionRateLimit(
    "metadata-fetch",
    session.user.id,
    MAX_FETCHES_PER_HOUR,
    FETCH_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many requests. Maximum " +
          MAX_FETCHES_PER_HOUR +
          " metadata fetches per hour.",
      },
      { status: 429, headers: NO_STORE_HEADERS },
    );
  }

  const rawUrl = new URL(request.url).searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json(
      { error: "URL is required" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  let requestedUrl: string;
  try {
    requestedUrl = normalizeHttpUrl(rawUrl);
  } catch (error) {
    if (error instanceof UrlValidationError) {
      return NextResponse.json(
        { error: "Enter a valid HTTP or HTTPS website URL" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    throw error;
  }

  try {
    const initialAvailability =
      await getSubmissionUrlAvailability(requestedUrl);
    if (initialAvailability !== "available") {
      return duplicateResponse(initialAvailability);
    }
  } catch (error) {
    logger.error("Submission URL availability check failed:", error);
    return NextResponse.json(
      { error: "We could not check this URL right now. Please try again." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  let metadata: SubmissionMetadata;
  try {
    metadata = {
      ...(await fetchSubmissionMetadata(requestedUrl)),
      metadataSource: "fetched",
    };
  } catch (error) {
    if (error instanceof UrlValidationError) {
      logger.warn(
        "Submission metadata preflight rejected an unsafe URL",
        error,
      );
      return NextResponse.json(
        { error: "This URL cannot be fetched safely" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    if (canUseManualMetadataEntry(error)) {
      logger.warn(
        "Submission metadata fetch was rejected upstream; allowing manual entry",
        error,
      );
      return NextResponse.json(
        {
          ...createManualSubmissionMetadata(requestedUrl),
          availability: "available",
        },
        { headers: NO_STORE_HEADERS },
      );
    }

    logger.error("Submission metadata preflight failed:", error);

    return NextResponse.json(
      {
        error:
          "We could not fetch website details. Check the URL and try again.",
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }

  let finalUrl: string;
  try {
    finalUrl = normalizeHttpUrl(metadata.url);
  } catch (error) {
    logger.error("Metadata fetch returned an invalid canonical URL:", error);
    return NextResponse.json(
      {
        error:
          "We could not fetch website details. Check the URL and try again.",
      },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }

  if (finalUrl === requestedUrl) {
    return NextResponse.json(
      {
        ...metadata,
        url: finalUrl,
        availability: "available",
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  try {
    const finalAvailability = await getSubmissionUrlAvailability(finalUrl);
    if (finalAvailability !== "available") {
      return duplicateResponse(finalAvailability);
    }
  } catch (error) {
    logger.error("Redirected submission URL availability check failed:", error);
    return NextResponse.json(
      { error: "We could not check this URL right now. Please try again." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    {
      ...metadata,
      url: finalUrl,
      availability: "available",
    },
    { headers: NO_STORE_HEADERS },
  );
}
