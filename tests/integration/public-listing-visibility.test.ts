// Runs only with RUN_DB_TESTS=1 against a disposable database; never point it
// at production. It keeps browser-facing directory reads aligned with the
// published/non-archived/non-deleted public API lifecycle boundary.
import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { eq, inArray, like } from "drizzle-orm";
import { db } from "@/db/client";
import {
  bookmarkCategories,
  bookmarkTags,
  bookmarks,
  categories,
  collectionBookmarks,
  collections,
  tags,
} from "@/db/schema";
mock.module("next/cache", () => ({
  revalidateTag: () => {},
  updateTag: () => {},
  revalidatePath: () => {},
  unstable_cache: (fn: unknown) => fn,
}));

const {
  getBookmarkBySlug,
  getBookmarksByCategory,
  getBookmarksByTagSlug,
  getCollectionWithBookmarksTranslated,
  getRelatedBookmarks,
  getTagsWithCount,
  searchBookmarks,
} = await import("@/lib/data");

const run = process.env.RUN_DB_TESTS === "1";
const suite = run ? describe : describe.skip;

const PREFIX = "https://itest.example/public-listing-visibility-";
const SEARCH_TERM = "Phase eight public visibility fixture";
const CATEGORY_SLUG = "itest-public-listing-visibility";
const TAG_SLUG = "itest-public-listing-visibility";
const COLLECTION_SLUG = "itest-public-listing-visibility";
const DRAFT_COLLECTION_SLUG = "itest-public-listing-visibility-draft";

const PUBLIC = {
  url: `${PREFIX}published`,
  slug: "itest-public-listing-visibility-published",
};
const DRAFT = {
  url: `${PREFIX}draft`,
  slug: "itest-public-listing-visibility-draft",
};
const ARCHIVED = {
  url: `${PREFIX}archived`,
  slug: "itest-public-listing-visibility-archived",
};
const DELETED = {
  url: `${PREFIX}deleted`,
  slug: "itest-public-listing-visibility-deleted",
};
const FIXTURE_URLS = [PUBLIC.url, DRAFT.url, ARCHIVED.url, DELETED.url];

suite("public directory listing visibility (integration)", () => {
  let categoryId: number;
  let tagId: number;
  let publicBookmarkId: number;
  let publicCollectionId: number;
  let draftCollectionId: number;

  beforeAll(async () => {
    await db
      .delete(collections)
      .where(
        inArray(collections.slug, [COLLECTION_SLUG, DRAFT_COLLECTION_SLUG]),
      );
    await db.delete(bookmarks).where(like(bookmarks.url, `${PREFIX}%`));
    await db.delete(tags).where(eq(tags.slug, TAG_SLUG));
    await db.delete(categories).where(eq(categories.slug, CATEGORY_SLUG));

    const [category] = await db
      .insert(categories)
      .values({
        name: "Public listing visibility",
        slug: CATEGORY_SLUG,
      })
      .returning({ id: categories.id });
    const [tag] = await db
      .insert(tags)
      .values({
        name: "Public listing visibility tag",
        slug: TAG_SLUG,
      })
      .returning({ id: tags.id });
    const [publicCollection] = await db
      .insert(collections)
      .values({
        title: "Public listing visibility collection",
        slug: COLLECTION_SLUG,
        status: "published",
        publishedAt: new Date("2026-08-20T10:00:00.000Z"),
      })
      .returning({ id: collections.id });
    const [draftCollection] = await db
      .insert(collections)
      .values({
        title: "Draft listing visibility collection",
        slug: DRAFT_COLLECTION_SLUG,
        status: "draft",
      })
      .returning({ id: collections.id });

    if (!category || !tag || !publicCollection || !draftCollection) {
      throw new Error("Could not create public-listing visibility fixtures");
    }

    categoryId = category.id;
    tagId = tag.id;
    publicCollectionId = publicCollection.id;
    draftCollectionId = draftCollection.id;

    const createdAt = new Date("2026-08-20T10:00:00.000Z");
    const [publicBookmark] = await db
      .insert(bookmarks)
      .values([
        {
          ...PUBLIC,
          title: `${SEARCH_TERM} published`,
          categoryId,
          status: "published",
          isArchived: false,
          publishedAt: createdAt,
          createdAt,
          updatedAt: createdAt,
        },
        {
          ...DRAFT,
          title: `${SEARCH_TERM} draft`,
          categoryId,
          status: "draft",
          isArchived: false,
          createdAt,
          updatedAt: createdAt,
        },
        {
          ...ARCHIVED,
          title: `${SEARCH_TERM} archived`,
          categoryId,
          status: "published",
          isArchived: true,
          createdAt,
          updatedAt: createdAt,
        },
        {
          ...DELETED,
          title: `${SEARCH_TERM} deleted`,
          categoryId,
          status: "archived",
          isArchived: true,
          deletedAt: createdAt,
          createdAt,
          updatedAt: createdAt,
        },
      ])
      .returning({ id: bookmarks.id, slug: bookmarks.slug });

    if (!publicBookmark) {
      throw new Error("Could not create published public-listing fixture");
    }
    publicBookmarkId = publicBookmark.id;

    const fixtureBookmarks = await db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(inArray(bookmarks.url, FIXTURE_URLS));
    const fixtureIds = fixtureBookmarks.map((bookmark) => bookmark.id);

    // Production writes and migration 0023 keep the scalar primary category
    // and the ordered assignment table in sync. Model that invariant here so
    // this visibility test exercises the current category read path.
    await db.insert(bookmarkCategories).values(
      fixtureIds.map((bookmarkId) => ({
        bookmarkId,
        categoryId,
        position: 0,
        source: "migration",
      })),
    );
    await db
      .insert(bookmarkTags)
      .values(fixtureIds.map((bookmarkId) => ({ bookmarkId, tagId })));
    await db.insert(collectionBookmarks).values(
      fixtureIds.map((bookmarkId, sortOrder) => ({
        collectionId: publicCollectionId,
        bookmarkId,
        sortOrder,
      })),
    );
    await db.insert(collectionBookmarks).values({
      collectionId: draftCollectionId,
      bookmarkId: publicBookmarkId,
      sortOrder: 0,
    });
  });

  afterAll(async () => {
    await db
      .delete(collections)
      .where(
        inArray(collections.slug, [COLLECTION_SLUG, DRAFT_COLLECTION_SLUG]),
      );
    await db.delete(bookmarks).where(like(bookmarks.url, `${PREFIX}%`));
    await db.delete(tags).where(eq(tags.slug, TAG_SLUG));
    await db.delete(categories).where(eq(categories.slug, CATEGORY_SLUG));
  });

  test("hides non-public records across detail, search, category, tag, and collection reads", async () => {
    const [category, search, tagResults, tagCounts, collection] =
      await Promise.all([
        getBookmarksByCategory(categoryId),
        searchBookmarks(SEARCH_TERM),
        getBookmarksByTagSlug(TAG_SLUG),
        getTagsWithCount(),
        getCollectionWithBookmarksTranslated(COLLECTION_SLUG, "en"),
      ]);

    expect(await getBookmarkBySlug(PUBLIC.slug)).toMatchObject({
      id: publicBookmarkId,
      slug: PUBLIC.slug,
    });
    await expect(getBookmarkBySlug(DRAFT.slug)).resolves.toBeNull();
    await expect(getBookmarkBySlug(ARCHIVED.slug)).resolves.toBeNull();
    await expect(getBookmarkBySlug(DELETED.slug)).resolves.toBeNull();

    expect(category.total).toBe(1);
    expect(category.bookmarks.map((bookmark) => bookmark.slug)).toEqual([
      PUBLIC.slug,
    ]);
    expect(search.map((bookmark) => bookmark.slug)).toEqual([PUBLIC.slug]);
    expect(tagResults.total).toBe(1);
    expect(tagResults.bookmarks.map((bookmark) => bookmark.slug)).toEqual([
      PUBLIC.slug,
    ]);
    expect(tagCounts.find((tag) => tag.id === tagId)?.count).toBe(1);
    expect(collection?.bookmarks.map((bookmark) => bookmark.slug)).toEqual([
      PUBLIC.slug,
    ]);
    await expect(
      getCollectionWithBookmarksTranslated(DRAFT_COLLECTION_SLUG, "en"),
    ).resolves.toBeNull();
  });

  test("does not surface hidden siblings as related listings", async () => {
    const related = await getRelatedBookmarks(categoryId, publicBookmarkId, 10);

    expect(related).toEqual([]);
  });
});
