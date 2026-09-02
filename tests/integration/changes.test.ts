// Integration tests for the /api/v1/changes data-layer contract. Runs only
// with RUN_DB_TESTS=1 against a disposable DB; never point at production.
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  bookmarkTags,
  bookmarks,
  categories,
  tags,
  translations,
} from "@/db/schema";
import { listChanges } from "@/lib/data/products";
import { replaceBookmarkCategories } from "@/lib/category-assignments";

const run = process.env.RUN_DB_TESTS === "1";
const suite = run ? describe : describe.skip;

const SLUG_UPSERT = "_itest-changes-upsert";
const SLUG_DELETE = "_itest-changes-delete";
const CATEGORY_SLUGS = ["_itest-changes-primary", "_itest-changes-secondary"];
const TAG_SLUG = "_itest-changes-tag";
const STALE_TIME = new Date("2020-01-01T00:00:00.000Z");

suite("changes data layer (integration)", () => {
  let upsertId: number;
  let deleteId: number;
  let categoryIds: number[] = [];
  let tagId: number | undefined;
  const since = new Date(Date.now() - 60_000); // window covering this suite

  beforeAll(async () => {
    const now = new Date();
    await db.delete(bookmarks).where(eq(bookmarks.slug, SLUG_UPSERT));
    await db.delete(bookmarks).where(eq(bookmarks.slug, SLUG_DELETE));

    const [upsert] = await db
      .insert(bookmarks)
      .values({
        url: "https://itest.example/changes-upsert",
        title: "Changes Upsert Tool",
        slug: SLUG_UPSERT,
        status: "published",
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: bookmarks.id });
    upsertId = upsert.id;

    // A deleted row: inserted then soft-deleted inside the window.
    const [d] = await db
      .insert(bookmarks)
      .values({
        url: "https://itest.example/changes-delete",
        title: "Changes Delete Tool",
        slug: SLUG_DELETE,
        status: "published",
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: bookmarks.id });
    deleteId = d.id;
    await db
      .update(bookmarks)
      .set({ deletedAt: new Date(), status: "archived", isArchived: true })
      .where(eq(bookmarks.id, deleteId));
  });

  afterAll(async () => {
    await db.delete(bookmarks).where(eq(bookmarks.slug, SLUG_UPSERT));
    await db.delete(bookmarks).where(eq(bookmarks.slug, SLUG_DELETE));
    if (categoryIds.length > 0) {
      await db.delete(categories).where(inArray(categories.id, categoryIds));
    }
    if (tagId !== undefined) {
      await db.delete(tags).where(eq(tags.id, tagId));
    }
  });

  async function resetPublicTimestamp(): Promise<void> {
    await db
      .update(bookmarks)
      .set({ updatedAt: STALE_TIME })
      .where(eq(bookmarks.id, upsertId));
  }

  async function expectFreshUpsert(locales?: string[]): Promise<void> {
    const result = await listChanges(
      since,
      null,
      100,
      new Set(["tags"]),
      locales,
    );
    const entry = result.data.find(
      (change) =>
        change.type === "upsert" && change.product.source_id === upsertId,
    );
    expect(entry?.type).toBe("upsert");
    if (entry?.type === "upsert") {
      expect(new Date(entry.updated_at).getTime()).toBeGreaterThan(
        STALE_TIME.getTime(),
      );
    }
  }

  test("visible rows come back as upsert with a full product payload", async () => {
    const res = await listChanges(since, null, 100, new Set(), ["en"]);
    const entry = res.data.find((e) => e.slug === SLUG_UPSERT);
    expect(entry?.type).toBe("upsert");
    if (entry?.type === "upsert") {
      expect(entry.product).toBeTruthy();
      expect((entry.product as { url?: string }).url).toBe(
        "https://itest.example/changes-upsert",
      );
    }
  });

  test("deleted rows come back as tombstones carrying source_id (NOT just slug)", async () => {
    // Regression guard: consumers match deletes by
    // (source, external_id) because slugs can change before deletion.
    const res = await listChanges(since, null, 100);
    const entry = res.data.find((e) => e.slug === SLUG_DELETE);
    expect(entry?.type).toBe("delete");
    if (entry?.type === "delete") {
      expect(entry.source_id).toBe(deleteId);
      expect(entry.deleted_at).toBeTruthy();
    }
  });

  test("public bookmark edits refresh updated_at even when the caller omits it", async () => {
    await resetPublicTimestamp();
    await db
      .update(bookmarks)
      .set({ description: "Changed through the sync trigger" })
      .where(eq(bookmarks.id, upsertId));
    await expectFreshUpsert();
  });

  test("private-only bookmark edits do not create public sync noise", async () => {
    await resetPublicTimestamp();
    await db
      .update(bookmarks)
      .set({ notes: "Internal integration-test note" })
      .where(eq(bookmarks.id, upsertId));
    const [row] = await db
      .select({ updatedAt: bookmarks.updatedAt })
      .from(bookmarks)
      .where(eq(bookmarks.id, upsertId));
    expect(row.updatedAt.getTime()).toBe(STALE_TIME.getTime());
  });

  test("secondary-category replacement refreshes the parent bookmark", async () => {
    const inserted = await db
      .insert(categories)
      .values(
        CATEGORY_SLUGS.map((slug, index) => ({
          name: `Changes category ${index}`,
          slug,
          status: "active",
          groupKey: "build",
        })),
      )
      .returning({ id: categories.id });
    categoryIds = inserted.map((category) => category.id);
    await db.transaction((tx) =>
      replaceBookmarkCategories(tx, upsertId, [categoryIds[0]]),
    );
    await resetPublicTimestamp();
    await db.transaction((tx) =>
      replaceBookmarkCategories(tx, upsertId, categoryIds),
    );
    await expectFreshUpsert();
  });

  test("tag assignment refreshes the parent bookmark", async () => {
    const [tag] = await db
      .insert(tags)
      .values({ name: "Changes integration tag", slug: TAG_SLUG })
      .returning({ id: tags.id });
    tagId = tag.id;
    await resetPublicTimestamp();
    await db.insert(bookmarkTags).values({ bookmarkId: upsertId, tagId });
    await expectFreshUpsert();
  });

  test("bookmark translation writes refresh the localized change feed", async () => {
    await resetPublicTimestamp();
    await db.insert(translations).values({
      entityType: "bookmark",
      entityId: upsertId,
      locale: "zh",
      field: "description",
      value: "同步触发器翻译测试",
    });
    await expectFreshUpsert(["zh"]);
  });

  test("cursor pagination is stable and does not repeat entries", async () => {
    const first = await listChanges(since, null, 1);
    expect(first.data.length).toBe(1);
    if (first.hasMore) {
      const second = await listChanges(since, first.nextCursor, 100);
      const firstSlugs = new Set(first.data.map((e) => e.slug));
      for (const e of second.data) {
        expect(firstSlugs.has(e.slug)).toBe(false);
      }
    }
  });
});
