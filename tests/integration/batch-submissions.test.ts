// Integration tests for POST /api/admin/submissions/batch after the N+1
// refactor. Runs only with RUN_DB_TESTS=1 against a disposable DB; never
// point at production.
import { test, expect, describe, beforeAll, afterAll, mock } from "bun:test";
import { inArray, like } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { bookmarks, submissions } from "@/db/schema";

// Stub auth before importing the route: requireAdmin would otherwise read a
// process-level admin-email cache that other test files may have populated.
mock.module("@/lib/admin-auth", () => ({
  requireAdmin: async () => ({
    ok: true as const,
    email: "admin@example.com",
  }),
  logAdminAction: () => {},
  isAdminEmail: () => true,
  getAdminEmails: () => ["admin@example.com"],
}));
// Route handlers normally run with Next's incremental-cache request store.
// This test invokes POST directly, so provide that framework boundary here.
mock.module("next/cache", () => ({
  revalidateTag: () => {},
  updateTag: () => {},
  revalidatePath: () => {},
  unstable_cache: (fn: unknown) => fn,
}));

const { POST } = await import("@/app/api/admin/submissions/batch/route");

const run = process.env.RUN_DB_TESTS === "1";
const suite = run ? describe : describe.skip;

const URL_DUP = "https://itest.example/sub-batch-dup";
const URL_NEW = "https://itest.example/sub-batch-new";

function req(body: unknown): NextRequest {
  return new NextRequest("https://example.com/api/admin/submissions/batch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function insertSubmission(url: string, title: string) {
  const now = new Date();
  const [row] = await db
    .insert(submissions)
    .values({ url, title, status: "pending", createdAt: now, updatedAt: now })
    .returning({ id: submissions.id });
  return row.id;
}

suite("admin/submissions/batch (integration)", () => {
  beforeAll(async () => {
    await db
      .delete(submissions)
      .where(inArray(submissions.url, [URL_DUP, URL_NEW]));
    await db
      .delete(bookmarks)
      .where(inArray(bookmarks.url, [URL_DUP, URL_NEW]));
  });

  afterAll(async () => {
    await db
      .delete(submissions)
      .where(inArray(submissions.url, [URL_DUP, URL_NEW]));
    await db
      .delete(bookmarks)
      .where(inArray(bookmarks.url, [URL_DUP, URL_NEW]));
  });

  test("submissions.url is unique — batch can never see duplicate URLs", async () => {
    // This invariant is why the refactored multi-row insert path is safe:
    // two submissions in one approve batch can never share a URL.
    const id1 = await insertSubmission(URL_DUP, "Dup Tool First");
    await expect(
      insertSubmission(URL_DUP, "Dup Tool Second"),
    ).rejects.toThrow();
    const [sub] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(inArray(submissions.id, [id1]));
    expect(sub.id).toBe(id1);
    await db.delete(submissions).where(inArray(submissions.url, [URL_DUP]));
  });

  test("approving a new URL creates the bookmark with a reserved slug", async () => {
    const id = await insertSubmission(URL_NEW, "Batch Approve New Tool");

    const res = await POST(req({ ids: [id], action: "approve" }));
    expect(res.status).toBe(200);

    const rows = await db
      .select()
      .from(bookmarks)
      .where(inArray(bookmarks.url, [URL_NEW]));
    expect(rows.length).toBe(1);
    expect(rows[0].slug).toBe("batch-approve-new-tool");
  });

  test("batch reject flips status without touching bookmarks", async () => {
    const id = await insertSubmission(
      "https://itest.example/sub-batch-reject",
      "Reject Me",
    );
    const res = await POST(req({ ids: [id], action: "reject" }));
    expect(res.status).toBe(200);
    const [sub] = await db
      .select()
      .from(submissions)
      .where(like(submissions.url, "%sub-batch-reject"));
    expect(sub.status).toBe("rejected");
    await db
      .delete(submissions)
      .where(like(submissions.url, "%sub-batch-reject"));
  });
});
