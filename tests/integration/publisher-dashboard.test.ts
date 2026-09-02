// Runs only with RUN_DB_TESTS=1 against a disposable database; never point it
// at production. It verifies the owner boundary and the definition of a live
// directory listing used by the publisher dashboard.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { bookmarks, profiles, submissions, user } from "@/db/schema";
import { getPublisherDashboard } from "@/lib/data/publisher-dashboard";

const run = process.env.RUN_DB_TESTS === "1";
const suite = run ? describe : describe.skip;

const OWNER_A = "itest-publisher-dashboard-owner-a";
const OWNER_B = "itest-publisher-dashboard-owner-b";
const URL_LIVE = "https://itest.example/publisher-dashboard-live";
const URL_ARCHIVED = "https://itest.example/publisher-dashboard-archived";
const URL_DRAFT = "https://itest.example/publisher-dashboard-draft";
const URL_DELETED = "https://itest.example/publisher-dashboard-deleted";
const URL_PENDING = "https://itest.example/publisher-dashboard-pending";
const URL_REJECTED = "https://itest.example/publisher-dashboard-rejected";
const URL_VERIFIED = "https://itest.example/publisher-dashboard-verified";
const URL_OTHER_OWNER = "https://itest.example/publisher-dashboard-other-owner";
const URLs = [
  URL_LIVE,
  URL_ARCHIVED,
  URL_DRAFT,
  URL_DELETED,
  URL_PENDING,
  URL_REJECTED,
  URL_VERIFIED,
  URL_OTHER_OWNER,
];
const NOW = new Date("2026-08-26T12:00:00.000Z");
const LIVE_PUBLISHED_AT = new Date("2026-08-24T12:00:00.000Z");

suite("publisher dashboard data layer (integration)", () => {
  beforeAll(async () => {
    await db.delete(bookmarks).where(inArray(bookmarks.url, URLs));
    await db.delete(submissions).where(inArray(submissions.url, URLs));
    await db.delete(profiles).where(inArray(profiles.id, [OWNER_A, OWNER_B]));
    await db.delete(user).where(inArray(user.id, [OWNER_A, OWNER_B]));
    await db.insert(user).values([
      {
        id: OWNER_A,
        name: "Owner A",
        email: "owner-a@example.com",
        emailVerified: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: OWNER_B,
        name: "Owner B",
        email: "owner-b@example.com",
        emailVerified: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);
    await db.insert(profiles).values([
      { id: OWNER_A, email: "owner-a@example.com" },
      { id: OWNER_B, email: "owner-b@example.com" },
    ]);

    await db.insert(submissions).values([
      {
        url: URL_LIVE,
        title: "Live publisher dashboard listing",
        tagline: "An active listing",
        userId: OWNER_A,
        status: "published",
        hasBadge: true,
        badgeVerified: true,
        isDofollow: true,
        createdAt: new Date("2026-08-24T10:00:00.000Z"),
        updatedAt: LIVE_PUBLISHED_AT,
      },
      {
        url: URL_ARCHIVED,
        title: "Archived publisher dashboard listing",
        userId: OWNER_A,
        status: "published",
        createdAt: new Date("2026-07-20T12:00:00.000Z"),
        updatedAt: new Date("2026-07-20T12:00:00.000Z"),
      },
      {
        url: URL_DRAFT,
        title: "Draft publisher dashboard listing",
        userId: OWNER_A,
        status: "published",
        createdAt: new Date("2026-08-23T12:00:00.000Z"),
        updatedAt: new Date("2026-08-23T12:00:00.000Z"),
      },
      {
        url: URL_DELETED,
        title: "Deleted publisher dashboard listing",
        userId: OWNER_A,
        status: "published",
        createdAt: new Date("2026-08-22T12:00:00.000Z"),
        updatedAt: new Date("2026-08-22T12:00:00.000Z"),
      },
      {
        url: URL_PENDING,
        title: "Pending publisher dashboard listing",
        userId: OWNER_A,
        status: "pending",
        hasBadge: true,
        badgeVerified: false,
        createdAt: new Date("2026-08-21T12:00:00.000Z"),
        updatedAt: new Date("2026-08-21T12:00:00.000Z"),
      },
      {
        url: URL_REJECTED,
        title: "Rejected publisher dashboard listing",
        userId: OWNER_A,
        status: "rejected",
        createdAt: new Date("2026-08-20T12:00:00.000Z"),
        updatedAt: new Date("2026-08-20T12:00:00.000Z"),
      },
      {
        url: URL_VERIFIED,
        title: "Verified publisher dashboard listing",
        userId: OWNER_A,
        status: "verified",
        hasBadge: true,
        badgeVerified: true,
        createdAt: new Date("2026-08-19T12:00:00.000Z"),
        updatedAt: new Date("2026-08-19T12:00:00.000Z"),
      },
      {
        url: URL_OTHER_OWNER,
        title: "Other owner's live dashboard listing",
        userId: OWNER_B,
        status: "published",
        createdAt: new Date("2026-08-25T12:00:00.000Z"),
        updatedAt: new Date("2026-08-25T12:00:00.000Z"),
      },
    ]);

    await db.insert(bookmarks).values([
      {
        url: URL_LIVE,
        title: "Live publisher dashboard listing",
        slug: "itest-publisher-dashboard-live",
        description: "An active listing",
        status: "published",
        isArchived: false,
        isDofollow: true,
        publishedAt: LIVE_PUBLISHED_AT,
      },
      {
        url: URL_ARCHIVED,
        title: "Archived publisher dashboard listing",
        slug: "itest-publisher-dashboard-archived",
        status: "published",
        isArchived: true,
      },
      {
        url: URL_DRAFT,
        title: "Draft publisher dashboard listing",
        slug: "itest-publisher-dashboard-draft",
        status: "draft",
        isArchived: false,
      },
      {
        url: URL_DELETED,
        title: "Deleted publisher dashboard listing",
        slug: "itest-publisher-dashboard-deleted",
        status: "published",
        isArchived: false,
        deletedAt: new Date("2026-08-23T12:00:00.000Z"),
      },
      {
        url: URL_OTHER_OWNER,
        title: "Other owner's live dashboard listing",
        slug: "itest-publisher-dashboard-other-owner",
        status: "published",
        isArchived: false,
      },
      // A public row with the same URL must not make the owner's still-pending
      // submission appear as a published listing in their dashboard.
      {
        url: URL_PENDING,
        title: "Public row unrelated to pending submission",
        slug: "itest-publisher-dashboard-pending-public-row",
        status: "published",
        isArchived: false,
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(bookmarks).where(inArray(bookmarks.url, URLs));
    await db.delete(submissions).where(inArray(submissions.url, URLs));
    await db.delete(user).where(inArray(user.id, [OWNER_A, OWNER_B]));
  });

  test("scopes all publication and review metrics to the signed-in publisher", async () => {
    const dashboard = await getPublisherDashboard(OWNER_A, NOW);

    expect(dashboard.summary).toEqual({
      totalSubmissions: 7,
      inReview: 2,
      publishedSubmissions: 4,
      rejectedSubmissions: 1,
      badgeVerifiedSubmissions: 2,
      badgeVerificationNeeded: 1,
      submissionsLast30Days: 6,
      liveListings: 1,
      dofollowListings: 1,
      decidedSubmissions: 5,
      publicationRate: 0.8,
    });
  });

  test("lists only publicly visible directory entries owned through a submission", async () => {
    const dashboard = await getPublisherDashboard(OWNER_A, NOW);

    expect(dashboard.liveListings).toEqual([
      {
        id: expect.any(Number),
        title: "Live publisher dashboard listing",
        slug: "itest-publisher-dashboard-live",
        description: "An active listing",
        publishedAt: LIVE_PUBLISHED_AT,
      },
    ]);
  });
});
