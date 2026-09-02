import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-error";
import { db } from "@/db/client";
import { apiTokens } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

// Revoke a token (idempotent).
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return jsonError("Unauthorized", auth.status);

  const idParse = idSchema.safeParse((await props.params).id);
  if (!idParse.success) return jsonError("Invalid id", 400);
  const id = idParse.data;

  const [revoked] = await db
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiTokens.id, id), isNull(apiTokens.revokedAt)))
    .returning({ id: apiTokens.id, consumer: apiTokens.consumer, prefix: apiTokens.prefix });

  if (!revoked) {
    // Idempotent: already-revoked is success; only a missing token is 404.
    const [exists] = await db
      .select({ id: apiTokens.id })
      .from(apiTokens)
      .where(eq(apiTokens.id, id))
      .limit(1);
    if (exists) return NextResponse.json({ message: "Token already revoked" });
    return jsonError("Token not found", 404);
  }

  logAdminAction({
    actorEmail: auth.email,
    action: "api_token.revoke",
    request,
    status: 200,
    targetType: "api_token",
    targetId: id,
    metadata: { consumer: revoked.consumer, prefix: revoked.prefix },
  });

  return NextResponse.json({ message: "Token revoked" });
}
