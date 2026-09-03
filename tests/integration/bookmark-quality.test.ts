// Runs only with RUN_DB_TESTS=1 against a disposable database; never point it
// at production. It verifies the SQL report and the live-listing boundary.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq, like, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { bookmarks, categories } from "@/db/schema";
import { getBookmarkQualityReport } from "@/lib/data/bookmark-quality";

const run = process.env.RUN_DB_TESTS === "1";
const suite = run ? describe : describe.skip;
const PREFIX = "https://itest.example/bookmark-quality-";
const CATEGORY_SLUG = "itest-bookmark-quality";
const URL_COMPLETE = `${PREFIX}complete`;
const URL_REVIEW = `${PREFIX}review`;
const URL_DRAFT = `${PREFIX}draft`;
const URL_ARCHIVED = `${PREFIX}archived`;

suite("bookmark quality data layer (integration)", () => {
  beforeAll(async () => {
    await db.delete(bookmarks).where(like(bookmarks.url, `${PREFIX}%`));
    await db.delete(categories).where(eq(categories.slug, CATEGORY_SLUG));

    const [category] = await db
      .insert(categories)
      .values({
        name: "Integration quality",
        slug: CATEGORY_SLUG,
      })
      .returning({ id: categories.id });

    if (!category) {
      throw new Error("Could not create integration-test category");
    }

    const createdAt = new Date("2026-08-26T12:00:00.000Z");

    await db.insert(bookmarks).values([
      {
        url: URL_COMPLETE,
        title: "Quality complete",
        slug: "itest-bookmark-quality-complete",
        categoryId: category.id,
        description: "A concise description",
        overview: "A helpful long-form overview",
        favicon: "https://cdn.itest.example/complete.svg",
        ogImage: "https://cdn.itest.example/complete.png",
        keyFeatures: ["A feature"],
        useCases: ["A use case"],
        status: "published",
        isArchived: false,
        createdAt,
        updatedAt: createdAt,
      },
      {
        url: URL_REVIEW,
        title: "Quality needs review",
        slug: "itest-bookmark-quality-review",
        categoryId: null,
        description: "\u00a0\t\n ",
        overview: null,
        favicon: "",
        ogImage: null,
        keyFeatures: [],
        useCases: [],
        status: "published",
        isArchived: false,
        createdAt,
        updatedAt: new Date("2026-08-26T12:01:00.000Z"),
      },
      {
        url: URL_DRAFT,
        title: "Quality draft exclusion",
        slug: "itest-bookmark-quality-draft",
        status: "draft",
        isArchived: false,
        createdAt,
        updatedAt: createdAt,
      },
      {
        url: URL_ARCHIVED,
        title: "Quality archived exclusion",
        slug: "itest-bookmark-quality-archived",
        status: "published",
        isArchived: true,
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    // The schema now types useCases as an array, while older rows may hold
    // malformed JSON. Store that legacy shape through SQL to verify the
    // defensive json_typeof() branch in the reporting query.
    await db.execute(sql`
      UPDATE ${bookmarks}
      SET ${sql.identifier("use_cases")} = ${JSON.stringify({ legacy: "object" })}::json
      WHERE ${bookmarks.url} = ${URL_REVIEW}
    `);
  });

  afterAll(async () => {
    await db.delete(bookmarks).where(like(bookmarks.url, `${PREFIX}%`));
    await db.delete(categories).where(eq(categories.slug, CATEGORY_SLUG));
  });

  test("reports deterministic content gaps only for active public listings", async () => {
    const report = await getBookmarkQualityReport();
    const reviewed = report.reviewQueue.find((item) => item.url === URL_REVIEW);

    expect(report.activeListings).toBeGreaterThanOrEqual(2);
    expect(report.completeListings).toBeGreaterThanOrEqual(1);
    expect(report.needsReview).toBeGreaterThanOrEqual(1);
    expect(reviewed).toMatchObject({
      title: "Quality needs review",
      issues: [
        "category",
        "description",
        "overview",
        "favicon",
        "ogImage",
        "keyFeatures",
        "useCases",
      ],
      score: 0,
    });
    expect(report.reviewQueue.some((item) => item.url === URL_COMPLETE)).toBe(
      false,
    );
    expect(report.reviewQueue.some((item) => item.url === URL_DRAFT)).toBe(
      false,
    );
    expect(report.reviewQueue.some((item) => item.url === URL_ARCHIVED)).toBe(
      false,
    );
    expect(
      report.issueCounts.find((item) => item.issue === "category")?.count,
    ).toBeGreaterThanOrEqual(1);
    expect(
      report.issueCounts.find((item) => item.issue === "description")?.count,
    ).toBeGreaterThanOrEqual(1);
  });
});
