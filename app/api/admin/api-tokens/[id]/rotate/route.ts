import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-error";
import { db } from "@/db/client";
import { apiTokens } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { generateApiToken } from "@/lib/api-token";
import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

const SAFE_COLUMNS = {
  id: apiTokens.id,
  consumer: apiTokens.consumer,
  prefix: apiTokens.prefix,
  scopes: apiTokens.scopes,
  rateLimitPerMin: apiTokens.rateLimitPerMin,
  lastUsedAt: apiTokens.lastUsedAt,
  createdAt: apiTokens.createdAt,
  revokedAt: apiTokens.revokedAt,
} as const;

// Rotate: revoke the old token and mint a new one with the same consumer,
// scopes and rate limit — atomically. Returns the new plaintext once.
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return jsonError("Unauthorized", auth.status);

  const idParse = idSchema.safeParse((await props.params).id);
  if (!idParse.success) return jsonError("Invalid id", 400);
  const id = idParse.data;

  const { token, tokenHash, prefix } = generateApiToken();

  const result = await db.transaction(async (tx) => {
    // Conditional revoke acts as the lock: only the caller that flips an
    // active token to revoked proceeds to mint. This rejects already-revoked
    // tokens and prevents concurrent rotates from minting multiple replacements.
    const [old] = await tx
      .update(apiTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiTokens.id, id), isNull(apiTokens.revokedAt)))
      .returning();
    if (!old) return null;
    const [created] = await tx
      .insert(apiTokens)
      .values({
        consumer: old.consumer,
        tokenHash,
        prefix,
        scopes: old.scopes,
        rateLimitPerMin: old.rateLimitPerMin,
      })
      .returning(SAFE_COLUMNS);
    return { old, created };
  });

  if (!result) return jsonError("Token not found or already revoked", 404);

  logAdminAction({
    actorEmail: auth.email,
    action: "api_token.rotate",
    request,
    status: 200,
    targetType: "api_token",
    targetId: result.created.id,
    metadata: { consumer: result.created.consumer, oldId: id, oldPrefix: result.old.prefix, newPrefix: prefix },
  });

  return NextResponse.json({ data: { ...result.created, token } });
}
