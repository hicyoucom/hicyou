// Per-token rate limiting, reusing hicyou's DB-backed limiter (no Redis here).
// 1-minute fixed window keyed by token id.
import { checkActionRateLimit } from "@/lib/rate-limit";
import type { ApiToken } from "@/db/schema";
import { ApiError } from "./errors";

const WINDOW_MS = 60_000;

export type RateInfo = { limit: number; remaining: number };

export async function enforceRateLimit(token: ApiToken): Promise<RateInfo> {
  const limit = token.rateLimitPerMin ?? 60;
  const { allowed, remaining } = await checkActionRateLimit(
    "api_v1",
    String(token.id),
    limit,
    WINDOW_MS,
  );
  if (!allowed) {
    throw new ApiError(
      "rate_limited",
      `Rate limit exceeded for consumer '${token.consumer}'`,
      429,
      { retry_after: 60 },
    );
  }
  return { limit, remaining };
}
