import { NextResponse } from "next/server";

/**
 * Consistent JSON error response for first-party API routes (admin etc.):
 * `{ error: <message>, ...extra }` with the given status. The public consumer
 * API (/api/v1) uses its own richer shape via app/api/v1/_lib/errors.ts.
 */
export function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}
