import { apiRoute, jsonList, clampLimit, parseSince, SCHEMA_VERSION } from "../_lib/respond";
import { ApiError } from "../_lib/errors";
import { parseInclude } from "../_lib/serialize";
import { listProducts } from "@/lib/data/products";

export const GET = apiRoute(async (req) => {
  const q = new URL(req.url).searchParams;

  const status = q.get("status") ?? "published";
  if (status !== "published") {
    throw new ApiError("validation_error", "Only status=published is supported", 400);
  }

  const locales = (q.get("locale") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const result = await listProducts({
    updatedSince: parseSince(q.get("updated_since")),
    cursor: q.get("cursor"),
    limit: clampLimit(q.get("limit")),
    categorySlug: q.get("category") ?? undefined,
    locales,
    include: parseInclude(q.get("include")),
  });

  return jsonList({
    data: result.data,
    next_cursor: result.nextCursor,
    server_time: new Date().toISOString(),
    meta: { schema_version: SCHEMA_VERSION, returned: result.data.length, has_more: result.hasMore },
  });
});
