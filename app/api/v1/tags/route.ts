import { apiRoute, jsonList } from "../_lib/respond";
import { listTags } from "@/lib/data/products";

export const GET = apiRoute(async () => {
  const data = await listTags();
  return jsonList({ data, server_time: new Date().toISOString() });
});
