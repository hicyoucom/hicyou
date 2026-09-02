// Shared request pipeline + JSON response helpers for /api/v1.
import { NextResponse, after } from "next/server";
import { db } from "@/db/client";
import { apiRequestLogs, type ApiToken } from "@/db/schema";
import { requireToken } from "./auth";
import { enforceRateLimit, type RateInfo } from "./rate-limit";
import { ApiError, errorResponse } from "./errors";
import { logger } from "@/lib/logger";

export const SCHEMA_VERSION = "1.0";

export type ApiContext<P = unknown> = { token: ApiToken; rate: RateInfo; params?: P };

/** Per-request metric for the usage dashboard; scheduled via after() so it
 *  doesn't block the response yet still runs before the invocation ends. */
function logApiRequest(consumer: string, method: string, path: string, status: number, durationMs: number): void {
  try {
    after(async () => {
      try {
        await db.insert(apiRequestLogs).values({ consumer, method, path, status, durationMs });
      } catch (err) {
        logger.error("[api/v1] metric insert failed:", err);
      }
    });
  } catch (err) {
    // after() outside a request scope (e.g. tests) — never break the response.
    logger.error("[api/v1] after() unavailable:", err);
  }
}

/**
 * Wraps a route handler with auth (token → scope → rate limit) + error handling
 * + request metrics. The handler receives the resolved ApiContext.
 *
 * Auth is inlined (not via gate()) so the consumer is known before the rate
 * limiter can throw — otherwise 429s would be attributed to "anonymous". Only
 * authenticated requests are metered; unauthenticated/malformed ones are NOT
 * persisted, so /api/v1 has no anonymous DB-write amplification vector.
 */
export function apiRoute<P = unknown>(
  handler: (req: Request, ctx: ApiContext<P>) => Promise<NextResponse>,
  scope = "read:products",
) {
  // `params` typed required to satisfy Next's route validator; guarded at
  // runtime since non-dynamic routes don't actually pass it.
  return async (req: Request, segment: { params: Promise<P> }): Promise<NextResponse> => {
    const start = Date.now();
    let consumer: string | null = null;
    let res: NextResponse;
    try {
      const token = await requireToken(req);
      consumer = token.consumer;
      if (!token.scopes?.includes(scope)) {
        throw new ApiError("forbidden", `Token is missing required scope '${scope}'`, 403);
      }
      const rate = await enforceRateLimit(token);
      const params = segment?.params ? await segment.params : undefined;
      res = await handler(req, { token, rate, params });
    } catch (err) {
      res = errorResponse(err);
    }
    if (consumer) {
      logApiRequest(consumer, req.method, new URL(req.url).pathname, res.status, Date.now() - start);
    }
    return res;
  };
}

// Token-gated responses MUST NOT be stored by shared caches — otherwise a
// cached body could be served to a different/anonymous caller, bypassing auth
// and rate limits. (Per spec §16.2: we cache server-side via the data layer,
// not at the CDN edge, since responses don't vary by token.)
export function jsonList(body: unknown): NextResponse {
  const res = NextResponse.json(body);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export function clampLimit(raw: string | null, def = 100, max = 500): number {
  const n = parseInt(raw ?? "", 10);
  if (Number.isNaN(n)) return def;
  return Math.min(Math.max(n, 1), max);
}

export function parseSince(raw: string | null, required = false): Date | undefined {
  if (!raw) {
    if (required) throw new ApiError("validation_error", "`since` is required (ISO 8601)", 400);
    return undefined;
  }
  const t = Date.parse(raw);
  if (Number.isNaN(t)) throw new ApiError("validation_error", "Invalid timestamp; use ISO 8601", 400);
  return new Date(t);
}
