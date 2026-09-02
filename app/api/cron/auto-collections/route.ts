import { NextResponse } from "next/server";
import { revalidateAutoCollectionPages } from "@/lib/auto-collection-cache";
import { runAutoCollectionGeneration } from "@/lib/auto-collections";
import { verifyCronAuth } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function statusForOutcome(outcome: string): number {
  switch (outcome) {
    case "not_configured":
      return 503;
    case "failed":
      return 500;
    case "in_progress":
      return 202;
    default:
      return 200;
  }
}

/**
 * GET /api/cron/auto-collections
 *
 * A CRON_SECRET-protected task for Zeabur or another external scheduler. The
 * same immutable public-listing snapshot and idempotency record are used by
 * the manual admin trigger, so concurrent schedules cannot duplicate drafts.
 */
export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAutoCollectionGeneration({ source: "cron" });
  if (result.outcome === "completed") {
    revalidateAutoCollectionPages(result.created);
  }

  const status = statusForOutcome(result.outcome);
  return NextResponse.json(
    {
      ok: status < 400,
      ...result,
    },
    { status },
  );
}
