// Runs only against a disposable database. Verifies the intended retention
// contract: auth/profile rows cascade, historical submissions remain anonymous.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { account, profiles, session, submissions, user } from "@/db/schema";

const suite = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const USER_ID = "_itest-user-deletion";
const ORPHAN_ID = "_itest-user-deletion-orphan";
const SUBMISSION_URL = "https://itest.example/user-deletion";

suite("user deletion integrity (integration)", () => {
  beforeAll(async () => {
    await db.delete(submissions).where(eq(submissions.url, SUBMISSION_URL));
    await db.delete(user).where(eq(user.id, USER_ID));
  });

  afterAll(async () => {
    await db.delete(submissions).where(eq(submissions.url, SUBMISSION_URL));
    await db.delete(user).where(eq(user.id, USER_ID));
  });

  test("cascades auth/profile rows and preserves the submission with a null owner", async () => {
    const now = new Date();
    await db.insert(user).values({
      id: USER_ID,
      name: "Deletion test",
      email: "user-deletion@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
    await db
      .insert(profiles)
      .values({ id: USER_ID, email: "user-deletion@example.com" });
    await db.insert(account).values({
      id: "_itest-user-deletion-account",
      accountId: USER_ID,
      providerId: "credential",
      userId: USER_ID,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(session).values({
      id: "_itest-user-deletion-session",
      token: "_itest-user-deletion-token",
      userId: USER_ID,
      expiresAt: new Date(now.getTime() + 60_000),
      createdAt: now,
      updatedAt: now,
    });
    const [submission] = await db
      .insert(submissions)
      .values({
        url: SUBMISSION_URL,
        title: "Deletion retention",
        userId: USER_ID,
      })
      .returning({ id: submissions.id });

    await db.delete(user).where(eq(user.id, USER_ID));

    expect(
      await db.select().from(account).where(eq(account.userId, USER_ID)),
    ).toHaveLength(0);
    expect(
      await db.select().from(session).where(eq(session.userId, USER_ID)),
    ).toHaveLength(0);
    expect(
      await db.select().from(profiles).where(eq(profiles.id, USER_ID)),
    ).toHaveLength(0);
    const [retained] = await db
      .select({ userId: submissions.userId })
      .from(submissions)
      .where(eq(submissions.id, submission.id));
    expect(retained).toEqual({ userId: null });
  });

  test("rejects new profiles that do not belong to a Better Auth user", async () => {
    await expect(
      (async () => {
        await db.insert(profiles).values({
          id: ORPHAN_ID,
          email: "user-deletion-orphan@example.com",
          name: "Orphan profile",
        });
      })(),
    ).rejects.toThrow();
  });
});
