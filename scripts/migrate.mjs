#!/usr/bin/env node

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[migrate] DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(connectionString, {
  max: 1,
  prepare: false,
  connect_timeout: 30,
});

try {
  await migrate(drizzle(client), { migrationsFolder: "migrations" });
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
