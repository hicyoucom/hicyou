import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logAdminAction, requireAdmin } from "@/lib/admin-auth";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { reviewCategoryEnrichmentCandidates } from "@/lib/category-enrichment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  candidateIds: z.array(z.number().int().positive()).min(1).max(250),
  decision: z.enum(["approve", "reject"]),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await reviewCategoryEnrichmentCandidates({
    ...parsed.data,
    reviewedBy: auth.email,
  });
  const status = result.failedBookmarkIds.length > 0 ? 207 : 200;

  if (result.applied > 0) {
    revalidateTag(CACHE_TAGS.bookmarks, { expire: 0 });
    revalidateTag(CACHE_TAGS.categories, { expire: 0 });
    revalidatePath("/", "layout");
  }

  logAdminAction({
    actorEmail: auth.email,
    action: `category_enrichment.${parsed.data.decision}`,
    request,
    status,
    targetType: "category_assignment_candidate",
    metadata: {
      requested: parsed.data.candidateIds.length,
      applied: result.applied,
      rejected: result.rejected,
      failedBookmarkIds: result.failedBookmarkIds,
    },
  });

  return NextResponse.json({ ok: result.failedBookmarkIds.length === 0, ...result }, { status });
}
