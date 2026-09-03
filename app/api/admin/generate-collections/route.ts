import { NextResponse } from "next/server";
import { logAdminAction, requireAdmin } from "@/lib/admin-auth";
import { revalidateAutoCollectionPages } from "@/lib/auto-collection-cache";
import { runAutoCollectionGeneration } from "@/lib/auto-collections";

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
 * Creates AI-generated collection drafts from the current public directory.
 * It intentionally never publishes the output: an admin reviews and publishes
 * the draft in Hi Studio using the existing collection editor.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status },
    );
  }

  const result = await runAutoCollectionGeneration({
    source: "admin",
    requestedBy: auth.email,
  });
  if (result.outcome === "completed") {
    revalidateAutoCollectionPages(result.created);
  }

  const status = statusForOutcome(result.outcome);
  logAdminAction({
    actorEmail: auth.email,
    action: "collection.generate",
    request,
    status,
    targetType: "collection_generation_run",
    targetId: "runId" in result ? result.runId : null,
    metadata: {
      outcome: result.outcome,
      sourceBookmarkCount:
        "sourceBookmarkCount" in result ? result.sourceBookmarkCount : null,
      createdCount: result.outcome === "completed" ? result.created.length : 0,
    },
  });

  return NextResponse.json(
    {
      ok: status < 400,
      ...result,
    },
    { status },
  );
}
