// Token auth for the public API. Tokens are `hcy_live_<32 url-safe chars>`;
// only their SHA-256 hash is stored (GitHub-PAT style), so the DB lookup on the
// hash is itself the constant-time-ish comparison — no manual timingSafeEqual
// needed. A non-empty User-Agent is required to keep anonymous scanners out.
import { db } from "@/db/client";
import { apiTokens, type ApiToken } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { hashToken } from "@/lib/api-token";
import { ApiError } from "./errors";

const TOKEN_RE = /^Bearer\s+(hcy_live_[A-Za-z0-9_-]{32})$/;

export { hashToken };

export async function requireToken(req: Request): Promise<ApiToken> {
  const ua = req.headers.get("user-agent");
  if (!ua || ua.trim() === "") {
    throw new ApiError("unauthorized", "User-Agent header is required", 401);
  }

  const match = (req.headers.get("authorization") || "").match(TOKEN_RE);
  if (!match) {
    throw new ApiError("unauthorized", "Missing or malformed API token", 401);
  }

  const tokenHash = hashToken(match[1]);
  const [token] = await db
    .select()
    .from(apiTokens)
    .where(and(eq(apiTokens.tokenHash, tokenHash), isNull(apiTokens.revokedAt)))
    .limit(1);

  if (!token) {
    throw new ApiError("unauthorized", "Invalid or revoked API token", 401);
  }

  // Touch lastUsedAt without blocking the response.
  void db
    .update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokens.id, token.id))
    .catch(() => {});

  return token;
}
