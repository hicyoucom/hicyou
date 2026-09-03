import { timingSafeEqual } from "node:crypto";

/**
 * Verify an `Authorization: Bearer <token>` header against an expected secret
 * using a constant-time comparison. Fail-closed: returns false if `expected`
 * is empty/undefined, so missing config never bypasses auth.
 */
export function verifyBearerToken(
  request: Request | { headers: Headers },
  expected: string | undefined,
): boolean {
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  const provided = header.slice(prefix.length);

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verify a cron request's Authorization: Bearer <CRON_SECRET> header
 * using a constant-time comparison.
 */
export function verifyCronAuth(request: Request | { headers: Headers }): boolean {
  return verifyBearerToken(request, process.env.CRON_SECRET);
}
