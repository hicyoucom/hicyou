/**
 * IP-based rate limiting for submissions
 */

import { logger } from "@/lib/logger";
import { db } from "@/db/client";
import { submissions, rateLimits } from "@/db/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getTrustedAuthIpHeaders } from "@/lib/auth-ip";

const MAX_SUBMISSIONS_PER_DAY = 6;

/**
 * Check if an IP address has exceeded the daily submission limit
 * @param ip IP address to check
 * @returns Object with allowed status and remaining submissions
 */
export async function checkRateLimit(ip: string): Promise<{
  allowed: boolean;
  remaining: number;
  error?: string;
}> {
  try {
    // Calculate 24 hours ago as a proper Date
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    // Count submissions from this IP in the last 24 hours
    const recentSubmissions = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(
        and(
          eq(submissions.submitterIp, ip),
          gte(submissions.createdAt, oneDayAgo)
        )
      );

    const count = recentSubmissions[0]?.count || 0;
    const remaining = MAX_SUBMISSIONS_PER_DAY - count;

    if (count >= MAX_SUBMISSIONS_PER_DAY) {
      return {
        allowed: false,
        remaining: 0,
        error: `Too many submissions today. You can submit up to ${MAX_SUBMISSIONS_PER_DAY} websites per day. Please try again tomorrow or contact us via email.`,
      };
    }

    return {
      allowed: true,
      remaining,
    };
  } catch (error) {
    logger.error("Error checking rate limit:", error);
    // On error, deny the submission to be safe
    return {
      allowed: false,
      remaining: 0,
      error: "Rate limit check failed. Please try again.",
    };
  }
}

/**
 * Generic distributed rate limiter backed by the rate_limits table.
 * Atomically increments a counter scoped to (action, key); resets the window
 * if it has expired. Returns whether the request is allowed.
 */
export async function checkActionRateLimit(
  action: string,
  key: string,
  max: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number }> {
  if (!process.env.DATABASE_URL) {
    return { allowed: true, remaining: max };
  }
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  let rows: { count: number }[];
  try {
    // Atomic upsert: insert with count=1, or increment if window still valid,
    // or reset to 1 if the existing window has expired.
    rows = await db
      .insert(rateLimits)
      .values({ action, key, count: 1, windowStart: now })
      .onConflictDoUpdate({
        target: [rateLimits.action, rateLimits.key],
        // Pass timestamps as ISO strings + ::timestamp cast. Interpolating raw
        // JS Date objects into a sql`` template fails under postgres-js with
        // prepare:false ("argument must be of type string … Received Date"),
        // which silently forced the non-atomic fallback on every call.
        set: {
          count: sql`CASE WHEN ${rateLimits.windowStart} < ${windowStart.toISOString()}::timestamp THEN 1 ELSE ${rateLimits.count} + 1 END`,
          windowStart: sql`CASE WHEN ${rateLimits.windowStart} < ${windowStart.toISOString()}::timestamp THEN ${now.toISOString()}::timestamp ELSE ${rateLimits.windowStart} END`,
        },
      })
      .returning({ count: rateLimits.count });
  } catch (error) {
    logger.error(
      "rate_limits upsert failed; falling back to non-atomic rate limiting. Run migrations on the production database.",
      error,
    );
    rows = await checkActionRateLimitWithoutConflictTarget(action, key, windowStart, now);
  }

  const count = rows[0]?.count ?? 1;
  return { allowed: count <= max, remaining: Math.max(0, max - count) };
}

async function checkActionRateLimitWithoutConflictTarget(
  action: string,
  key: string,
  windowStart: Date,
  now: Date,
): Promise<{ count: number }[]> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({
        id: rateLimits.id,
        count: rateLimits.count,
        windowStart: rateLimits.windowStart,
      })
      .from(rateLimits)
      .where(and(eq(rateLimits.action, action), eq(rateLimits.key, key)))
      .orderBy(desc(rateLimits.windowStart), desc(rateLimits.id))
      .limit(1);

    const row = existing[0];
    if (!row) {
      return tx
        .insert(rateLimits)
        .values({ action, key, count: 1, windowStart: now })
        .returning({ count: rateLimits.count });
    }

    if (row.windowStart < windowStart) {
      return tx
        .update(rateLimits)
        .set({ count: 1, windowStart: now })
        .where(eq(rateLimits.id, row.id))
        .returning({ count: rateLimits.count });
    }

    return tx
      .update(rateLimits)
      .set({ count: row.count + 1 })
      .where(eq(rateLimits.id, row.id))
      .returning({ count: rateLimits.count });
  });
}

/**
 * Get IP address from request headers.
 *
 * Canonical client-IP headers are trusted only when the deployment opts in
 * through BETTER_AUTH_IP_ADDRESS_HEADERS. This reuses the same allow-list as
 * Better Auth instead of silently trusting a header an origin client can set.
 * X-Forwarded-For remains an explicit TRUSTED_PROXIES fallback.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;

  for (const headerName of getTrustedAuthIpHeaders() ?? []) {
    const candidate = headers.get(headerName)?.trim();
    if (candidate && isValidIp(candidate)) return candidate;
  }

  // Fail closed when the deployment has not declared its proxy topology.
  // Otherwise a direct client could supply X-Forwarded-For and rotate the
  // apparent address used by public-endpoint rate limits.
  const trustedProxyHops = Number(process.env.TRUSTED_PROXIES ?? 0);
  if (trustedProxyHops > 0) {
    const forwardedFor = headers.get("x-forwarded-for");
    if (forwardedFor) {
      const parts = forwardedFor.split(",").map((s) => s.trim()).filter(Boolean);
      const idx = Math.max(0, parts.length - trustedProxyHops);
      const candidate = parts[idx];
      if (candidate && isValidIp(candidate)) {
        return candidate;
      }
    }
  }

  return "unknown";
}

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:]+$/;
function isValidIp(ip: string): boolean {
  if (ip.length > 45) return false;
  if (IPV4_RE.test(ip)) {
    return ip.split(".").every((o) => {
      const n = Number(o);
      return Number.isInteger(n) && n >= 0 && n <= 255;
    });
  }
  return IPV6_RE.test(ip) && ip.includes(":");
}
