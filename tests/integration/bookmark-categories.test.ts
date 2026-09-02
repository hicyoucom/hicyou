// Runs only with RUN_DB_TESTS=1 against a disposable database; never point it
// at production. Verifies the normalized multi-category contract end to end.
import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { bookmarkCategories, bookmarks, categories } from "@/db/schema";
import {
  addBookmarkCategories,
  CategoryAssignmentError,
  replaceBookmarkCategories,
} from "@/lib/category-assignments";

mock.module("next/cache", () => ({
  revalidateTag: () => {},
  updateTag: () => {},
  revalidatePath: () => {},
  unstable_cache: (fn: unknown) => fn,
}));

const { getBookmarksByCategory } = await import("@/lib/data");
const { getProductBySlug, listProducts } = await import("@/lib/data/products");

const run = process.env.RUN_DB_TESTS === "1";
const suite = run ? describe : describe.skip;
const BOOKMARK_SLUG = "_itest-multi-category";
const CATEGORY_SLUGS = [
  "_itest-primary-category",
  "_itest-secondary-category",
  "_itest-draft-category",
];

suite("bookmark multi-category assignments (integration)", () => {
  let bookmarkId: number;
  let categoryIds: number[];

  beforeAll(async () => {
    await db.delete(bookmarks).where(eq(bookmarks.slug, BOOKMARK_SLUG));
    await db.delete(categories).where(inArray(categories.slug, CATEGORY_SLUGS));
    const insertedCategories = await db
      .insert(categories)
      .values(
        CATEGORY_SLUGS.map((slug, index) => ({
          name: `Integration category ${index}`,
          slug,
          status: index === 2 ? "draft" : "active",
          groupKey: "build",
        })),
      )
      .returning({ id: categories.id });
    categoryIds = insertedCategories.map((category) => category.id);

    const [bookmark] = await db
      .insert(bookmarks)
      .values({
        url: "https://itest.example/multi-category",
        title: "Multi-category integration tool",
        slug: BOOKMARK_SLUG,
        status: "published",
        publishedAt: new Date(),
      })
      .returning({ id: bookmarks.id });
    bookmarkId = bookmark.id;

    await db.transaction((tx) =>
      replaceBookmarkCategories(tx, bookmarkId, categoryIds.slice(0, 2), {
        source: "manual",
      }),
    );
  });

  afterAll(async () => {
    await db.delete(bookmarks).where(eq(bookmarks.id, bookmarkId));
    await db.delete(categories).where(inArray(categories.id, categoryIds));
  });

  test("stores ordered assignments and projects the primary category", async () => {
    const rows = await db
      .select({
        categoryId: bookmarkCategories.categoryId,
        position: bookmarkCategories.position,
      })
      .from(bookmarkCategories)
      .where(eq(bookmarkCategories.bookmarkId, bookmarkId))
      .orderBy(bookmarkCategories.position);
    expect(rows).toEqual([
      { categoryId: categoryIds[0], position: 0 },
      { categoryId: categoryIds[1], position: 1 },
    ]);

    const [bookmark] = await db
      .select({ categoryId: bookmarks.categoryId })
      .from(bookmarks)
      .where(eq(bookmarks.id, bookmarkId));
    expect(bookmark.categoryId).toBe(categoryIds[0]);
  });

  test("allows draft discovery tags only as secondary categories", async () => {
    await expect(
      db.transaction((tx) =>
        replaceBookmarkCategories(tx, bookmarkId, [categoryIds[2]], {
          allowDraft: true,
        }),
      ),
    ).rejects.toBeInstanceOf(CategoryAssignmentError);

    await db.transaction(async (tx) => {
      await replaceBookmarkCategories(
        tx,
        bookmarkId,
        [categoryIds[0], categoryIds[2]],
        { allowDraft: true },
      );
      await replaceBookmarkCategories(tx, bookmarkId, categoryIds.slice(0, 2));
    });
  });

  test("adds an approved discovery category without replacing primary provenance", async () => {
    await db.transaction(async (tx) => {
      await replaceBookmarkCategories(tx, bookmarkId, [categoryIds[0]], {
        source: "manual",
      });
      await addBookmarkCategories(tx, bookmarkId, [categoryIds[1]], "ai");
      const rows = await tx
        .select({
          categoryId: bookmarkCategories.categoryId,
          source: bookmarkCategories.source,
        })
        .from(bookmarkCategories)
        .where(eq(bookmarkCategories.bookmarkId, bookmarkId))
        .orderBy(bookmarkCategories.position);
      expect(rows).toEqual([
        { categoryId: categoryIds[0], source: "manual" },
        { categoryId: categoryIds[1], source: "ai" },
      ]);
      await replaceBookmarkCategories(tx, bookmarkId, categoryIds.slice(0, 2), {
        source: "manual",
      });
    });
  });

  test("secondary category pages and API filters include the bookmark once", async () => {
    const page = await getBookmarksByCategory(categoryIds[1], { pageSize: 30 });
    expect(page.bookmarks.filter((bookmark) => bookmark.id === bookmarkId)).toHaveLength(1);

    const apiPage = await listProducts({
      limit: 100,
      categorySlug: CATEGORY_SLUGS[1],
      include: new Set(),
    });
    expect(apiPage.data.filter((product) => product.source_id === bookmarkId)).toHaveLength(1);
  });

  test("public product keeps category and adds ordered categories", async () => {
    const product = await getProductBySlug(BOOKMARK_SLUG, new Set());
    expect(product?.category?.slug).toBe(CATEGORY_SLUGS[0]);
    expect(product?.categories).toEqual([
      { slug: CATEGORY_SLUGS[0], name: "Integration category 0", primary: true },
      { slug: CATEGORY_SLUGS[1], name: "Integration category 1", primary: false },
    ]);
  });
});
