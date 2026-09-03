import { NextResponse } from "next/server";
import { apiRoute, SCHEMA_VERSION } from "../_lib/respond";

export const dynamic = "force-dynamic"; // per-consumer rate fields; never cached

export const GET = apiRoute(async (_req, { token, rate }) => {
  const res = NextResponse.json({
    schema_version: SCHEMA_VERSION,
    server_time: new Date().toISOString(),
    endpoints: ["products", "search", "export", "categories", "tags", "changes"],
    rate_limit: { per_min: rate.limit, remaining: rate.remaining },
    consumer: token.consumer,
  });
  res.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
  return res;
});
