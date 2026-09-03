import { NextResponse } from "next/server";
import { openapiSpec } from "../_lib/openapi";

// Public (no token) — consumers fetch this to codegen clients.
export function GET() {
  const res = NextResponse.json(openapiSpec);
  res.headers.set("Cache-Control", "public, max-age=3600");
  return res;
}
