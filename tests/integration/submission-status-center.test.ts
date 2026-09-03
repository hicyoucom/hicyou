// Runs only with RUN_DB_TESTS=1 against a disposable database; never point it
// at production. It verifies the owner boundary and the status-center index.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { bookmarks, profiles, submissions, user } from "@/db/schema";
import { getSubmissionStatusCenter } from "@/lib/data/submission-status-center";

const run = process.env.RUN_DB_TESTS === "1";
const suite = run ? describe : describe.skip;

const OWNER_A = "itest-submission-status-owner-a";
const OWNER_B = "itest-submission-status-owner-b";
const URL_PENDING = "https://itest.example/submission-status-pending";
const URL_VERIFIED = "https://itest.example/submission-status-verified";
const URL_PUBLISHED = "https://itest.example/submission-status-published";
const URL_LEGACY = "https://itest.example/submission-status-legacy";
const URL_OTHER_OWNER = "https://itest.example/submission-status-other-owner";
const URLs = [
  URL_PENDING,
  URL_VERIFIED,
  URL_PUBLISHED,
  URL_LEGACY,
  URL_OTHER_OWNER,
];

suite("submission status center data layer (integration)", () => {
  beforeAll(async () => {
    await db.delete(submissions).where(inArray(submissions.url, URLs));
    await db.delete(bookmarks).where(inArray(bookmarks.url, URLs));
    await db.delete(profiles).where(inArray(profiles.id, [OWNER_A, OWNER_B]));
    await db.delete(user).where(inArray(user.id, [OWNER_A, OWNER_B]));

    const now = new Date("2026-08-20T00:00:00.000Z");
    await db.insert(user).values([
      {
        id: OWNER_A,
        name: "Owner A",
        email: "owner-a@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: OWNER_B,
        name: "Owner B",
        email: "owner-b@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.insert(profiles).values([
      { id: OWNER_A, email: "owner-a@example.com", fullName: "Owner A" },
      { id: OWNER_B, email: "owner-b@example.com", fullName: "Owner B" },
    ]);

    await db.insert(submissions).values([
      {
        url: URL_PENDING,
        title: "Pending status center",
        userId: OWNER_A,
        status: "pending",
        createdAt: new Date("2026-08-20T12:00:00.000Z"),
        updatedAt: new Date("2026-08-20T12:00:00.000Z"),
      },
      {
        url: URL_VERIFIED,
        title: "Verified status center",
        userId: OWNER_A,
        status: "verified",
        hasBadge: true,
        badgeVerified: true,
        badgeVerifiedAt: new Date("2026-08-21T12:00:00.000Z"),
        publishAt: new Date("2026-09-01T12:00:00.000Z"),
        createdAt: new Date("2026-08-22T12:00:00.000Z"),
        updatedAt: new Date("2026-08-22T12:00:00.000Z"),
      },
      {
        url: URL_PUBLISHED,
        title: "Published status center",
        userId: OWNER_A,
        status: "published",
        createdAt: new Date("2026-08-25T12:00:00.000Z"),
        updatedAt: new Date("2026-08-25T12:00:00.000Z"),
      },
      {
        url: URL_LEGACY,
        title: "Legacy status center",
        userId: OWNER_A,
        status: "legacy_import",
        createdAt: new Date("2026-08-24T12:00:00.000Z"),
        updatedAt: new Date("2026-08-24T12:00:00.000Z"),
      },
      {
        url: URL_OTHER_OWNER,
        title: "Other owner status center",
        userId: OWNER_B,
        status: "published",
        createdAt: new Date("2026-08-26T12:00:00.000Z"),
        updatedAt: new Date("2026-08-26T12:00:00.000Z"),
      },
    ]);

    await db.insert(bookmarks).values({
      url: URL_PUBLISHED,
      title: "Published status center",
      slug: "published-status-center",
      status: "published",
      isArchived: false,
    });
  });

  afterAll(async () => {
    await db.delete(submissions).where(inArray(submissions.url, URLs));
    await db.delete(bookmarks).where(inArray(bookmarks.url, URLs));
    await db.delete(user).where(inArray(user.id, [OWNER_A, OWNER_B]));
  });

  test("installs a valid owner-and-recency index outside the migration transaction", async () => {
    const indexes = (await db.execute(sql`
      SELECT i.indisvalid AS "isValid"
      FROM pg_index AS i
      WHERE i.indexrelid = to_regclass('public.submissions_user_created_idx')
    `)) as unknown as Array<{ isValid: boolean }>;

    expect(indexes).toEqual([{ isValid: true }]);
  });

  test("returns only the signed-in owner's records, counts legacy states, and exposes a live listing safely", async () => {
    const center = await getSubmissionStatusCenter(OWNER_A);

    expect(center.counts).toEqual({
      total: 4,
      pending: 1,
      verified: 1,
      published: 1,
      rejected: 0,
      unclassified: 1,
    });
    expect(center.total).toBe(4);
    expect(center.entries.map((entry) => entry.title)).toEqual([
      "Published status center",
      "Legacy status center",
      "Verified status center",
      "Pending status center",
    ]);
    expect(
      center.entries.find((entry) => entry.url === URL_PUBLISHED)
        ?.publicListingSlug,
    ).toBe("published-status-center");
    expect(center.entries.some((entry) => entry.url === URL_OTHER_OWNER)).toBe(
      false,
    );
  });

  test("applies a status filter without changing the owner's summary counts", async () => {
    const center = await getSubmissionStatusCenter(OWNER_A, {
      status: "verified",
    });

    expect(center.total).toBe(1);
    expect(center.entries).toHaveLength(1);
    expect(center.entries[0]).toMatchObject({
      title: "Verified status center",
      status: "verified",
      badgeVerified: true,
      publishAt: new Date("2026-09-01T12:00:00.000Z"),
    });
    expect(center.counts.total).toBe(4);
  });

  test("normalizes a page beyond the available results", async () => {
    const center = await getSubmissionStatusCenter(OWNER_A, { page: 10_000 });

    expect(center.page).toBe(1);
    expect(center.totalPages).toBe(1);
    expect(center.entries).toHaveLength(4);
  });
});
