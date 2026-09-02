// Integration tests for the public-API data layer. These hit a real Postgres,
// so they only run when RUN_DB_TESTS=1 (CI provides a disposable DB); otherwise
// they're skipped. Never point RUN_DB_TESTS at a production database.
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { bookmarks } from "@/db/schema";
import { listProducts, getProductBySlug, searchProducts, listChanges } from "@/lib/data/products";

const run = process.env.RUN_DB_TESTS === "1";
const suite = run ? describe : describe.skip;

const SLUG_PUB = "_itest-published-zztop";
const SLUG_DRAFT = "_itest-draft-hidden";

suite("products data layer (integration)", () => {
  let pubId: number;

  beforeAll(async () => {
    const now = new Date();
    await db.delete(bookmarks).where(eq(bookmarks.slug, SLUG_PUB));
    await db.delete(bookmarks).where(eq(bookmarks.slug, SLUG_DRAFT));
    const [p] = await db
      .insert(bookmarks)
      .values({
        url: "https://itest.example/pub",
        title: "ZZTop Integration Tool",
        slug: SLUG_PUB,
        status: "published",
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: bookmarks.id });
    pubId = p.id;
    await db.insert(bookmarks).values({
      url: "https://itest.example/draft",
      title: "Draft Hidden Tool",
      slug: SLUG_DRAFT,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  });

  afterAll(async () => {
    await db.delete(bookmarks).where(eq(bookmarks.slug, SLUG_PUB));
    await db.delete(bookmarks).where(eq(bookmarks.slug, SLUG_DRAFT));
  });

  test("listProducts returns published, excludes draft", async () => {
    const res = await listProducts({ limit: 500, include: new Set() });
    const slugs = res.data.map((p) => p.slug);
    expect(slugs).toContain(SLUG_PUB);
    expect(slugs).not.toContain(SLUG_DRAFT);
  });

  test("getProductBySlug: published found, draft is null", async () => {
    expect(await getProductBySlug(SLUG_PUB, new Set())).toBeTruthy();
    expect(await getProductBySlug(SLUG_DRAFT, new Set())).toBeNull();
  });

  test("searchProducts matches by title", async () => {
    const r = await searchProducts("ZZTop Integration", { limit: 10, include: new Set() });
    expect(r.some((p) => p.slug === SLUG_PUB)).toBe(true);
  });

  test("listChanges emits a delete tombstone with source_id after soft-delete", async () => {
    const since = new Date(Date.now() - 60_000);
    await db
      .update(bookmarks)
      .set({ deletedAt: new Date(), status: "archived", isArchived: true, updatedAt: new Date() })
      .where(eq(bookmarks.id, pubId));

    const r = await listChanges(since, null, 500);
    const tomb = r.data.find((c) => c.type === "delete" && c.slug === SLUG_PUB);
    expect(tomb).toBeTruthy();
    expect(tomb && tomb.type === "delete" ? tomb.source_id : -1).toBe(pubId);
  });
});
