import { NextResponse } from "next/server";
import { apiRoute } from "../_lib/respond";
import { parseInclude } from "../_lib/serialize";
import { listProducts, type ListResult } from "@/lib/data/products";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/export — streams ALL published products as NDJSON (one JSON object
 * per line) for an initial full sync without client-side paging. Pages the
 * keyset internally at 500/page, refilling on backpressure (pull) and stopping
 * if the client disconnects. The first page is fetched eagerly so a DB error
 * surfaces as a real error response instead of a truncated 200.
 */
export const GET = apiRoute(async (req) => {
  const q = new URL(req.url).searchParams;
  const include = parseInclude(q.get("include"));
  const locales = (q.get("locale") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const encoder = new TextEncoder();

  let cursor: string | null = null;
  let buffer: ListResult["data"] = [];
  let done = false;

  async function fetchPage() {
    const page = await listProducts({ limit: 500, cursor, include, locales });
    buffer = page.data;
    cursor = page.nextCursor;
    done = !cursor;
  }

  await fetchPage(); // eager first page → DB errors become a 500 here

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (req.signal.aborted) return controller.close();
        if (buffer.length === 0) {
          if (done) return controller.close();
          await fetchPage();
          if (buffer.length === 0) return controller.close();
        }
        const chunk = buffer.map((p) => JSON.stringify(p) + "\n").join("");
        buffer = [];
        controller.enqueue(encoder.encode(chunk));
      } catch (err) {
        logger.error("[api/v1/export] stream failed:", err);
        controller.error(err);
      }
    },
    cancel() {
      done = true;
      buffer = [];
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
});
