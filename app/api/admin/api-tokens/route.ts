import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-error";
import { db } from "@/db/client";
import { apiTokens } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { generateApiToken } from "@/lib/api-token";
import { z } from "zod";

// Allowlist of grantable scopes — keep in sync with the public API's gate().
const SCOPE = z.enum(["read:products"]);

// Safe projection — NEVER return tokenHash.
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

const createSchema = z.object({
  consumer: z.string().trim().min(1).max(64),
  rateLimitPerMin: z.coerce.number().int().min(1).max(100000).default(60),
  scopes: z.array(SCOPE).nonempty().default(["read:products"]),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return jsonError("Unauthorized", auth.status);

  const tokens = await db.select(SAFE_COLUMNS).from(apiTokens).orderBy(desc(apiTokens.createdAt));
  return NextResponse.json({ data: tokens });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return jsonError("Unauthorized", auth.status);

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid body", 400, { details: parsed.error.flatten() });
  }
  const { consumer, rateLimitPerMin, scopes } = parsed.data;

  const { token, tokenHash, prefix } = generateApiToken();
  const [row] = await db
    .insert(apiTokens)
    .values({ consumer, tokenHash, prefix, scopes, rateLimitPerMin })
    .returning(SAFE_COLUMNS);

  logAdminAction({
    actorEmail: auth.email,
    action: "api_token.create",
    request,
    status: 201,
    targetType: "api_token",
    targetId: row.id,
    metadata: { consumer, prefix, rateLimitPerMin, scopes },
  });

  // Plaintext token is returned exactly once.
  return NextResponse.json({ data: { ...row, token } }, { status: 201 });
}
