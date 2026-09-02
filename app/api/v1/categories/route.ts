import { apiRoute, jsonList } from "../_lib/respond";
import { listCategories } from "@/lib/data/products";

export const GET = apiRoute(async (req) => {
  const locales = (new URL(req.url).searchParams.get("locale") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const data = await listCategories(locales);
  return jsonList({ data, server_time: new Date().toISOString() });
});
