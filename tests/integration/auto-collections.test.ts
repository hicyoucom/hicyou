// Runs only with RUN_DB_TESTS=1 against a disposable database; never point it
// at production. The AI call is injected, so this test makes no network call.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq, like } from "drizzle-orm";
import { db } from "@/db/client";
import {
  bookmarks,
  categories,
  collectionBookmarks,
  collectionGenerationRuns,
  collections,
} from "@/db/schema";
import { runAutoCollectionGeneration } from "@/lib/auto-collections";

const run = process.env.RUN_DB_TESTS === "1";
const suite = run ? describe : describe.skip;

const PREFIX = "https://itest.example/auto-collections-";
const CATEGORY_SLUG = "itest-auto-collections";
const FIXTURE_URLS = [
  "public-a",
  "public-b",
  "public-c",
  "draft",
  "archived",
  "deleted",
].map((suffix) => `${PREFIX}${suffix}`);
const FIXTURE_SLUGS = [
  "public-a",
  "public-b",
  "public-c",
  "draft",
  "archived",
  "deleted",
].map((suffix) => `itest-auto-collections-${suffix}`);

const previousAiKey = process.env.AI_API_KEY;

suite("automatic collection generation (integration)", () => {
  let categoryId: number;
  let publicBookmarkIds: number[] = [];
  let generatorCalls = 0;
  let receivedSourceIds: number[] = [];
  let receivedExistingTitles: string[] = [];

  beforeAll(async () => {
    process.env.AI_API_KEY = "test-key";

    await db
      .delete(collections)
      .where(like(collections.slug, "itest-auto-collections-%"));
    await db
      .delete(collectionGenerationRuns)
      .where(
        like(collectionGenerationRuns.requestedBy, "itest-auto-collections%"),
      );
    await db.delete(bookmarks).where(like(bookmarks.url, `${PREFIX}%`));
    await db.delete(categories).where(eq(categories.slug, CATEGORY_SLUG));

    const [category] = await db
      .insert(categories)
      .values({ name: "Auto collections", slug: CATEGORY_SLUG })
      .returning({ id: categories.id });
    if (!category) throw new Error("Could not create auto-collection category");
    categoryId = category.id;

    await db.insert(collections).values({
      title: "Internal editorial theme",
      slug: "itest-auto-collections-private-draft",
      status: "draft",
    });
    await db.insert(collections).values({
      title: "Published visible theme",
      slug: "itest-auto-collections-published-theme",
      status: "published",
    });

    const now = new Date("2026-08-25T12:00:00.000Z");
    const inserted = await db
      .insert(bookmarks)
      .values([
        {
          url: FIXTURE_URLS[0],
          slug: FIXTURE_SLUGS[0],
          title: "Auto collection public A",
          categoryId,
          status: "published",
          isArchived: false,
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
          ogImage: "https://images.example/public-a.png",
        },
        {
          url: FIXTURE_URLS[1],
          slug: FIXTURE_SLUGS[1],
          title: "Auto collection public B",
          categoryId,
          status: "published",
          isArchived: false,
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          url: FIXTURE_URLS[2],
          slug: FIXTURE_SLUGS[2],
          title: "Auto collection public C",
          categoryId,
          status: "published",
          isArchived: false,
          publishedAt: now,
          createdAt: now,
        },
        {
          url: FIXTURE_URLS[3],
          slug: FIXTURE_SLUGS[3],
          title: "Auto collection draft",
          categoryId,
          status: "draft",
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          url: FIXTURE_URLS[4],
          slug: FIXTURE_SLUGS[4],
          title: "Auto collection archived",
          categoryId,
          status: "published",
          isArchived: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          url: FIXTURE_URLS[5],
          slug: FIXTURE_SLUGS[5],
          title: "Auto collection deleted",
          categoryId,
          status: "archived",
          isArchived: true,
          deletedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .returning({ id: bookmarks.id, slug: bookmarks.slug });

    publicBookmarkIds = inserted
      .filter((bookmark) =>
        [FIXTURE_SLUGS[0], FIXTURE_SLUGS[1], FIXTURE_SLUGS[2]].includes(
          bookmark.slug,
        ),
      )
      .map((bookmark) => bookmark.id);
  });

  afterAll(async () => {
    await db
      .delete(collections)
      .where(like(collections.slug, "itest-auto-collections-%"));
    await db.delete(bookmarks).where(like(bookmarks.url, `${PREFIX}%`));
    await db
      .delete(collectionGenerationRuns)
      .where(
        like(collectionGenerationRuns.requestedBy, "itest-auto-collections%"),
      );
    await db.delete(categories).where(eq(categories.slug, CATEGORY_SLUG));

    if (previousAiKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = previousAiKey;
  });

  const generate = async ({
    bookmarks: source,
    existingCollections,
  }: {
    bookmarks: { id: number }[];
    existingCollections: { title: string }[];
  }) => {
    generatorCalls += 1;
    receivedSourceIds = source
      .map((bookmark) => bookmark.id)
      .sort((a, b) => a - b);
    receivedExistingTitles = existingCollections
      .map((collection) => collection.title)
      .sort();
    return [
      {
        title: "iTest Auto Collections Topic Draft",
        description:
          "A reviewable draft assembled from the current public directory entries only.",
        content:
          "## Integration topic\n\nThis is a deliberately long enough draft introduction for an automatically generated collection that an editor must review before publication.",
        bookmarkIds: [...publicBookmarkIds, 999_999],
        notes: {
          [publicBookmarkIds[0]]: "The first public tool anchors this theme.",
          "999999": "Unknown IDs must never be persisted.",
        },
        coverBookmarkId: publicBookmarkIds[0],
      },
      {
        title: "Internal editorial theme",
        description:
          "This duplicate unpublished theme must still be rejected locally.",
        content:
          "## Internal duplicate\n\nThis candidate is intentionally long enough to pass the content schema before the local duplicate-theme check rejects it.",
        bookmarkIds: [...publicBookmarkIds],
        notes: {},
        coverBookmarkId: publicBookmarkIds[0],
      },
    ];
  };

  test("creates an auditable draft from public entries and skips an unchanged rerun", async () => {
    const first = await runAutoCollectionGeneration({
      source: "admin",
      requestedBy: "itest-auto-collections@example.com",
      generate,
    });

    expect(first.outcome).toBe("completed");
    if (first.outcome !== "completed")
      throw new Error("Expected completed generation");
    expect(first.created).toHaveLength(1);
    expect(first.created[0]?.bookmarkCount).toBe(3);
    expect(receivedSourceIds).toEqual(
      [...publicBookmarkIds].sort((a, b) => a - b),
    );
    expect(receivedExistingTitles).not.toContain("Internal editorial theme");
    expect(receivedExistingTitles).toContain("Published visible theme");

    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, first.created[0]!.id));
    expect(collection).toMatchObject({
      title: "iTest Auto Collections Topic Draft",
      status: "draft",
      generationRunId: first.runId,
      coverImage: "https://images.example/public-a.png",
    });

    const associations = await db
      .select({
        bookmarkId: collectionBookmarks.bookmarkId,
        note: collectionBookmarks.note,
      })
      .from(collectionBookmarks)
      .where(eq(collectionBookmarks.collectionId, first.created[0]!.id));
    expect(
      associations
        .map((association) => association.bookmarkId)
        .sort((a, b) => a - b),
    ).toEqual([...publicBookmarkIds].sort((a, b) => a - b));
    expect(
      associations.find(
        (association) => association.bookmarkId === publicBookmarkIds[0],
      )?.note,
    ).toBe("The first public tool anchors this theme.");

    const [generationRun] = await db
      .select()
      .from(collectionGenerationRuns)
      .where(eq(collectionGenerationRuns.id, first.runId));
    expect(generationRun).toMatchObject({
      status: "succeeded",
      source: "admin",
      requestedBy: "itest-auto-collections@example.com",
      sourceBookmarkCount: 3,
      generatedCount: 1,
      createdCount: 1,
    });

    const second = await runAutoCollectionGeneration({
      source: "cron",
      generate,
    });
    expect(second).toMatchObject({
      outcome: "unchanged",
      runId: first.runId,
      sourceBookmarkCount: 3,
    });
    expect(generatorCalls).toBe(1);
  });
});
