import { apiRoute, jsonList, clampLimit } from "../_lib/respond";
import { ApiError } from "../_lib/errors";
import { parseInclude } from "../_lib/serialize";
import { searchProducts } from "@/lib/data/products";

export const GET = apiRoute(async (req) => {
  const q = new URL(req.url).searchParams;
  const term = (q.get("q") ?? "").trim();
  if (term.length < 2) {
    throw new ApiError("validation_error", "`q` must be at least 2 characters", 400);
  }
  const locales = (q.get("locale") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const data = await searchProducts(term, {
    limit: clampLimit(q.get("limit"), 20, 100),
    locales,
    include: parseInclude(q.get("include")),
  });

  return jsonList({ data, query: term, returned: data.length, server_time: new Date().toISOString() });
});
