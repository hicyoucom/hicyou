// Integration tests for POST /api/admin/bookmarks/batch (the fetcher's main
// write path) after the N+1 refactor. Runs only with RUN_DB_TESTS=1 against a
// disposable DB; never point at production.
import { test, expect, describe, beforeAll, afterAll, mock } from "bun:test";
import { inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { bookmarks } from "@/db/schema";
import { CACHE_TAGS } from "@/lib/cache-tags";

// revalidateTag requires a Next.js request context; stub it out for tests.
// mock.module is process-global in bun, so the factory must re-export every
// next/cache symbol other test files might touch (e.g. unstable_cache is
// called at module top level in lib/data.ts).
const revalidateTag = mock(() => {});
mock.module("next/cache", () => ({
  revalidateTag,
  updateTag: () => {},
  revalidatePath: () => {},
  unstable_cache: (fn: unknown) => fn,
}));

const { POST } = await import("@/app/api/admin/bookmarks/batch/route");

const run = process.env.RUN_DB_TESTS === "1";
const suite = run ? describe : describe.skip;

const URL_A = "https://itest.example/batch-a";
const URL_B = "https://itest.example/batch-b";
const URL_C = "https://itest.example/batch-c";

function req(body: unknown, token?: string): NextRequest {
  return new NextRequest("https://example.com/api/admin/bookmarks/batch", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

suite("admin/bookmarks/batch (integration)", () => {
  const PREV_CRON_SECRET = process.env.CRON_SECRET;

  beforeAll(async () => {
    process.env.CRON_SECRET = "itest-cron-secret";
    revalidateTag.mockClear();
    await db.delete(bookmarks).where(inArray(bookmarks.url, [URL_A, URL_B, URL_C]));
  });

  afterAll(async () => {
    await db.delete(bookmarks).where(inArray(bookmarks.url, [URL_A, URL_B, URL_C]));
    if (PREV_CRON_SECRET === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = PREV_CRON_SECRET;
  });

  test("rejects requests without the cron bearer token", async () => {
    const res = await POST(req({ bookmarks: [] }, "wrong-token"));
    expect(res.status).toBe(401);
  });

  test("creates new rows, skips existing urls, and dedupes the payload", async () => {
    const payload = {
      bookmarks: [
        { url: URL_A, title: "Batch Tool A" },
        { url: URL_B, title: "Batch Tool B" },
        // Duplicate of URL_A inside the same payload: the old row-by-row loop
        // reported the 2nd occurrence as skipped_exists — keep that contract.
        { url: URL_A, title: "Batch Tool A duplicate" },
      ],
    };

    const res = await POST(req(payload, "itest-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    // Results stay index-aligned with the payload.
    expect(body.results).toEqual([
      { url: URL_A, status: "created" },
      { url: URL_B, status: "created" },
      { url: URL_A, status: "skipped_exists" },
    ]);
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.bookmarks, { expire: 0 });

    // Second run: everything already exists.
    const res2 = await POST(req(payload, "itest-cron-secret"));
    const body2 = await res2.json();
    expect(body2.results.map((r: { status: string }) => r.status)).toEqual([
      "skipped_exists",
      "skipped_exists",
      "skipped_exists",
    ]);

    const rows = await db
      .select({ url: bookmarks.url })
      .from(bookmarks)
      .where(inArray(bookmarks.url, [URL_A, URL_B]));
    expect(rows.length).toBe(2);
  });
});
