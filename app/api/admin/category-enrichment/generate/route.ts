import { NextResponse } from "next/server";
import { z } from "zod";

import { logAdminAction, requireAdmin } from "@/lib/admin-auth";
import { runCategoryEnrichment } from "@/lib/category-enrichment";
import { getLLMConfig, isLLMConfigured } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const requestSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(100),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await runCategoryEnrichment({
    requestedBy: auth.email,
    limit: parsed.data.limit,
  });
  const status =
    result.outcome === "not_configured"
      ? 503
      : result.outcome === "failed"
        ? 500
        : result.outcome === "in_progress"
          ? 202
          : 200;

  logAdminAction({
    actorEmail: auth.email,
    action: "category_enrichment.generate",
    request,
    status,
    targetType: "category_enrichment_run",
    targetId: "runId" in result ? result.runId : null,
    metadata: {
      outcome: result.outcome,
      model: isLLMConfigured() ? getLLMConfig().model : null,
      sourceBookmarkCount:
        "sourceBookmarkCount" in result ? result.sourceBookmarkCount : null,
      candidateCount:
        "candidateCount" in result ? result.candidateCount : null,
    },
  });

  return NextResponse.json({ ok: status < 400, ...result }, { status });
}
