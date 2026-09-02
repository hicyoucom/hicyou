// Runs only with RUN_DB_TESTS=1 against a disposable database; never point it
// at production. URL availability deliberately exposes no record IDs.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { bookmarks, submissions } from "@/db/schema";
import { getSubmissionUrlAvailability } from "@/lib/data/submission-url-availability";

const run = process.env.RUN_DB_TESTS === "1";
const suite = run ? describe : describe.skip;

const URL_AVAILABLE = "https://itest.example/url-availability-available";
const URL_SUBMITTED = "https://itest.example/url-availability-submitted";
const URL_LISTED = "https://itest.example/url-availability-listed";
const URL_LEGACY_ROOT = "https://itest.example";
const URL_LEGACY_ROOT_STORED = "https://itest.example/";
const TEST_URLS = [
  URL_AVAILABLE,
  URL_SUBMITTED,
  URL_LISTED,
  URL_LEGACY_ROOT,
  URL_LEGACY_ROOT_STORED,
];

suite("submission URL availability (integration)", () => {
  beforeAll(async () => {
    await db.delete(submissions).where(inArray(submissions.url, TEST_URLS));
    await db.delete(bookmarks).where(inArray(bookmarks.url, TEST_URLS));

    const now = new Date();
    await db.insert(submissions).values({
      url: URL_SUBMITTED,
      title: "Pending availability test",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(bookmarks).values({
      url: URL_LISTED,
      title: "Listed availability test",
      slug: "listed-availability-test",
    });
    await db.insert(bookmarks).values({
      url: URL_LEGACY_ROOT_STORED,
      title: "Legacy root slash availability test",
      slug: "legacy-root-slash-availability-test",
    });
  });

  afterAll(async () => {
    await db.delete(submissions).where(inArray(submissions.url, TEST_URLS));
    await db.delete(bookmarks).where(inArray(bookmarks.url, TEST_URLS));
  });

  test("distinguishes available, previously submitted, and published URLs", async () => {
    await expect(getSubmissionUrlAvailability(URL_AVAILABLE)).resolves.toBe(
      "available",
    );
    await expect(getSubmissionUrlAvailability(URL_SUBMITTED)).resolves.toBe(
      "already_submitted",
    );
    await expect(getSubmissionUrlAvailability(URL_LISTED)).resolves.toBe(
      "already_listed",
    );
    await expect(getSubmissionUrlAvailability(URL_LEGACY_ROOT)).resolves.toBe(
      "already_listed",
    );
  });
});
