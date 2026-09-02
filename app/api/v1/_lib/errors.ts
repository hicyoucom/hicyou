// Unified error model for the public API. Every handler throws ApiError and
// wraps its body in withApiError() so consumers get one stable error shape.
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "not_found"
  | "validation_error"
  | "internal";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status: number,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorResponse(err: unknown): NextResponse {
  let res: NextResponse;
  if (err instanceof ApiError) {
    res = NextResponse.json(
      { error: { code: err.code, message: err.message, ...(err.extra ?? {}) } },
      { status: err.status },
    );
  } else {
    logger.error("[api/v1] unexpected error:", err);
    res = NextResponse.json({ error: { code: "internal", message: "Internal error" } }, { status: 500 });
  }
  // Token-gated endpoint: never let a shared cache store an error body.
  res.headers.set("Cache-Control", "private, no-store");
  if (err instanceof ApiError && err.status === 429) {
    const retryAfter = err.extra?.retry_after;
    if (typeof retryAfter === "number" && Number.isFinite(retryAfter)) {
      res.headers.set("Retry-After", String(Math.max(0, Math.ceil(retryAfter))));
    }
  }
  return res;
}
