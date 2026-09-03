// Integration tests for slug reservation against a real DB. Runs only with
// RUN_DB_TESTS=1 against a disposable DB; never point at production.
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { like } from "drizzle-orm";
import { db } from "@/db/client";
import { bookmarks } from "@/db/schema";
import { generateUniqueSlug, reserveUniqueSlugs } from "@/lib/slug";

const run = process.env.RUN_DB_TESTS === "1";
const suite = run ? describe : describe.skip;

// Must match generateSlug("Slug Collision ZZQ") — the function under test
// derives the base from the title, so fixtures have to use the derived form.
const BASE = "slug-collision-zzq";

suite("slug reservation (integration)", () => {
  beforeAll(async () => {
    await db.delete(bookmarks).where(like(bookmarks.slug, `${BASE}%`));
    const now = new Date();
    await db.insert(bookmarks).values([
      {
        url: "https://itest.example/slug-1",
        title: "Slug Collision ZZQ",
        slug: BASE,
        status: "published",
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        url: "https://itest.example/slug-2",
        title: "Slug Collision ZZQ",
        slug: `${BASE}-2`,
        status: "published",
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(bookmarks).where(like(bookmarks.slug, `${BASE}%`));
  });

  test("generateUniqueSlug skips taken base and -2 in one call", async () => {
    const slug = await generateUniqueSlug("Slug Collision ZZQ");
    expect(slug).toBe(`${BASE}-3`);
  });

  test("generateUniqueSlug returns the base when free", async () => {
    const slug = await generateUniqueSlug("Totally Free Name ZQX");
    expect(slug).toBe("totally-free-name-zqx");
  });

  test("reserveUniqueSlugs is index-aligned and batch-duplicate safe", async () => {
    const slugs = await reserveUniqueSlugs([
      "Slug Collision ZZQ", // taken base+-2 → -3
      "Slug Collision ZZQ", // batch dup → -4
      "Fresh ZZQ Title", // free → base
    ]);
    expect(slugs).toEqual([`${BASE}-3`, `${BASE}-4`, "fresh-zzq-title"]);
  });
});
