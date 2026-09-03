import { NextResponse } from "next/server";
import { apiRoute } from "../../_lib/respond";
import { ApiError } from "../../_lib/errors";
import { parseInclude } from "../../_lib/serialize";
import { getProductBySlug } from "@/lib/data/products";

export const GET = apiRoute<{ slug: string }>(async (req, ctx) => {
  const slug = ctx.params!.slug;
  const include = parseInclude(new URL(req.url).searchParams.get("include"));
  const product = await getProductBySlug(slug, include);
  if (!product) throw new ApiError("not_found", "Product not found", 404);

  const res = NextResponse.json({ data: product, server_time: new Date().toISOString() });
  res.headers.set("Cache-Control", "private, no-store");
  return res;
});
