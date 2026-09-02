import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import "dotenv/config";

// Allow build to proceed without DATABASE_URL (for static generation/build time)
// In production runtime, this will be set by the platform.
const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";

if (!process.env.DATABASE_URL) {
  console.warn("⚠️  WARNING: DATABASE_URL is not set. Using dummy connection for build/static analysis.");
}

// Connection-pool tuning notes:
//   • prepare:false — required when the upstream Postgres sits behind a
//     pgbouncer-style pooler in transaction mode (prepared statements aren't
//     shared across pooler-managed connections). Harmless on a direct
//     connection, so keep it regardless.
//   • DB_POOL_MAX — client connections per process, default 1 (safe for any
//     upstream). Every SSR page that fans out Promise.all queries is
//     serialized over a single connection at max:1, so raising to 3-5 can
//     cut SSR latency — but ONLY after verifying the upstream has headroom.
//     See docs/DB_POOL_TUNING.md for the verification procedure.
//   • connect_timeout — fail fast during build/prerender when the DB is
//     cross-region; without this, postgres-js can hang on a stuck socket
//     until the per-page prerender timeout fires.
function parsePoolMax(): number {
  const n = Number(process.env.DB_POOL_MAX ?? 1);
  return Number.isInteger(n) && n >= 1 && n <= 20 ? n : 1;
}

const client = postgres(connectionString, {
  prepare: false,
  max: parsePoolMax(),
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  connect_timeout: 30,
});
export const db = drizzle(client, { schema });
