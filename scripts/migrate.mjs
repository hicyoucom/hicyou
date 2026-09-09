#!/usr/bin/env node

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { setTimeout as delay } from "node:timers/promises";
import { applyOnlineIndexes } from "./online-indexes.mjs";

const connectionString =
  process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[migrate] DATABASE_URL is required");
  process.exit(1);
}

// Session advisory locks and concurrent DDL need a direct/session connection.
if (new URL(connectionString).port === "6543") {
  throw new Error(
    "Set MIGRATION_DATABASE_URL to a direct or session-mode PostgreSQL connection; transaction pooling is unsupported for migrations",
  );
}
const client = postgres(connectionString, {
  max: 1,
  // Keep the advisory-lock session alive even during long index builds.
  max_lifetime: 0,
  prepare: false,
  connect_timeout: 30,
});

try {
  // Lock before Drizzle reads its journal or creates its schema. Locking only
  // the online-index phase leaves fresh and rolling replica starts racing.
  // A blocking advisory-lock SELECT leaves a transaction open while waiting.
  // CREATE INDEX CONCURRENTLY can wait for that transaction, producing a
  // deadlock. Poll the session lock with each attempt in a completed transaction.
  while (
    !(await client`select pg_try_advisory_lock(746192035) as locked`)[0].locked
  ) {
    await delay(250);
  }
  try {
    await migrate(drizzle(client), { migrationsFolder: "migrations" });
    await applyOnlineIndexes(client);
  } finally {
    await client`select pg_advisory_unlock(746192035)`;
  }
  console.log("[migrate] migrations applied");
} catch (error) {
  console.error(
    "[migrate] migration failed",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
