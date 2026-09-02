// Tests the single aggregate query against a disposable database. It is skipped
// unless RUN_DB_TESTS=1, so it must never be pointed at a production database.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { like, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { submissions } from "@/db/schema";
import { getSubmissionFunnel } from "@/lib/data/submission-funnel";

const run = process.env.RUN_DB_TESTS === "1";
const suite = run ? describe : describe.skip;
const PREFIX = "https://itest.example/submission-funnel-";
const SINCE = new Date("2026-08-01T00:00:00.000Z");

suite("submission funnel data layer (integration)", () => {
  beforeAll(async () => {
    await db.delete(submissions).where(like(submissions.url, `${PREFIX}%`));

    await db.insert(submissions).values([
      {
        url: `${PREFIX}pending`,
        title: "Funnel pending",
        status: "pending",
        createdAt: SINCE,
        updatedAt: SINCE,
      },
      {
        url: `${PREFIX}verified`,
        title: "Funnel verified",
        status: "verified",
        badgeVerified: true,
        createdAt: SINCE,
        updatedAt: SINCE,
      },
      {
        url: `${PREFIX}published`,
        title: "Funnel published",
        status: "published",
        badgeVerified: true,
        createdAt: SINCE,
        updatedAt: SINCE,
      },
      {
        url: `${PREFIX}rejected`,
        title: "Funnel rejected",
        status: "rejected",
        createdAt: SINCE,
        updatedAt: SINCE,
      },
      {
        url: `${PREFIX}unknown`,
        title: "Funnel unknown",
        status: "legacy_unknown",
        createdAt: SINCE,
        updatedAt: SINCE,
      },
      {
        url: `${PREFIX}excluded`,
        title: "Funnel excluded",
        status: "published",
        createdAt: new Date("2026-07-31T23:59:59.999Z"),
        updatedAt: SINCE,
      },
      {
        url: `${PREFIX}future`,
        title: "Funnel future",
        status: "published",
        createdAt: new Date("2026-08-31T00:00:00.001Z"),
        updatedAt: SINCE,
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(submissions).where(like(submissions.url, `${PREFIX}%`));
  });

  test("installs a valid created-at reporting index outside the migration transaction", async () => {
    const indexes = (await db.execute(sql`
      SELECT i.indisvalid AS "isValid"
      FROM pg_index AS i
      WHERE i.indexrelid = to_regclass('public.submissions_created_at_idx')
    `)) as unknown as Array<{ isValid: boolean }>;

    expect(indexes).toEqual([{ isValid: true }]);
  });

  test("aggregates a cohort and exposes unexpected statuses", async () => {
    const funnel = await getSubmissionFunnel(
      30,
      new Date("2026-08-31T00:00:00.000Z"),
    );

    expect(funnel.since).toEqual(SINCE);
    expect(funnel).toMatchObject({
      days: 30,
      submitted: 5,
      pending: 1,
      verified: 1,
      published: 1,
      rejected: 1,
      badgeVerified: 2,
      decided: 2,
      inReview: 2,
      unclassified: 1,
      decisionRate: 0.4,
      publishRate: 0.2,
      approvalRate: 0.5,
      badgeVerificationRate: 0.4,
    });
  });
});
