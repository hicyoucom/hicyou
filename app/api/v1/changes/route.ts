import { apiRoute, jsonList, clampLimit, parseSince, SCHEMA_VERSION } from "../_lib/respond";
import { parseInclude } from "../_lib/serialize";
import { listChanges } from "@/lib/data/products";

export const GET = apiRoute(async (req) => {
  const q = new URL(req.url).searchParams;
  const since = parseSince(q.get("since"), true)!;
  const include = parseInclude(q.get("include"));
  const locales = (q.get("locale") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const result = await listChanges(since, q.get("cursor"), clampLimit(q.get("limit")), include, locales);

  return jsonList({
    data: result.data,
    next_cursor: result.nextCursor,
    server_time: new Date().toISOString(),
    meta: { schema_version: SCHEMA_VERSION, returned: result.data.length, has_more: result.hasMore },
  });
});
