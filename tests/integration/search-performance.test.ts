import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  bookmarks,
  categories,
  bookmarkCategories,
  translations,
} from "@/db/schema";
import {
  querySearchBookmarks,
  getUntranslatedBookmarkIds,
  countUntranslatedBookmarks,
} from "@/lib/data";
import { buildTranslationTexts } from "@/lib/translation-fields";

const suite = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
suite("public search and translation work selection", () => {
  const ids: number[] = [];
  let categoryId: number;
  beforeAll(async () => {
    const [category] = await db
      .insert(categories)
      .values({ name: "ReviewCategoryNeedle", slug: "_review-search-category" })
      .returning();
    categoryId = category.id;
    const rows = await db
      .insert(bookmarks)
      .values([
        {
          url: "https://review.example/literal",
          slug: "_review-search-literal",
          title: "Review 100%_literal",
          overview: "long fallback ".repeat(1000),
          categoryId,
        },
        {
          url: "https://review.example/draft",
          slug: "_review-search-draft",
          title: "Review 100%_literal",
          status: "draft",
        },
        {
          url: "https://review.example/translated",
          slug: "_review-search-translated",
          title: "Review nested",
          overview: "Overview",
          keyFeatures: [
            "Feature",
            { name: "Name", description: "Description" },
          ],
          useCases: ["Case"],
          faqs: [{ question: "Question", answer: "Answer" }],
        },
      ])
      .returning();
    ids.push(...rows.map((row) => row.id));
    await db
      .insert(bookmarkCategories)
      .values({ bookmarkId: ids[0], categoryId, position: 0 });
  });
  afterAll(async () => {
    await db.delete(translations).where(inArray(translations.entityId, ids));
    await db.delete(bookmarks).where(inArray(bookmarks.id, ids));
    await db.delete(categories).where(eq(categories.id, categoryId));
  });
  test("literal wildcard search returns only visible matches and bounded card text", async () => {
    const rows = await querySearchBookmarks("100%_literal");
    expect(rows.map((row) => row.id)).toEqual([ids[0]]);
    expect(rows[0].overview?.length).toBe(320);
    expect(
      (await querySearchBookmarks("ReviewCategoryNeedle")).map((row) => row.id),
    ).toEqual([ids[0]]);
    expect(await querySearchBookmarks(" ")).toEqual([]);
  });
  test("SQL required fields match the translation writer, including nested JSON", async () => {
    const [entity] = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.id, ids[2]));
    const expected = Object.keys(buildTranslationTexts("bookmark", entity));
    const required = await db.execute<{ field: string }>(
      sql`select field from bookmarks b cross join lateral public.bookmark_translation_fields(b) where b.id = ${entity.id}`,
    );
    expect(required.map((row) => row.field).sort()).toEqual(expected.sort());
    const before = await countUntranslatedBookmarks("fr");
    expect(await getUntranslatedBookmarkIds("fr")).toContain(entity.id);
    await db
      .insert(translations)
      .values(
        expected.map((field) => ({
          entityType: "bookmark",
          entityId: entity.id,
          locale: "fr",
          field,
          value: "Traduction",
        })),
      );
    expect(await getUntranslatedBookmarkIds("fr")).not.toContain(entity.id);
    expect(await countUntranslatedBookmarks("fr")).toBe(before - 1);
    expect(
      (await getUntranslatedBookmarkIds("fr", 1)).length,
    ).toBeLessThanOrEqual(1);
  });
  test("legacy non-array JSON and whitespace produce the same field set", async () => {
    await db.execute(
      sql`update bookmarks set key_features = '{"legacy":true}'::json, use_cases = 'null'::json, faqs = '[{"question":"\u00a0\ufeff","answer":4}]'::json where id = ${ids[2]}`,
    );
    const [entity] = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.id, ids[2]));
    const required = await db.execute<{ field: string }>(
      sql`select field from bookmarks b cross join lateral public.bookmark_translation_fields(b) where b.id = ${entity.id}`,
    );
    expect(required.map((row) => row.field).sort()).toEqual(
      Object.keys(buildTranslationTexts("bookmark", entity)).sort(),
    );
  });
});
