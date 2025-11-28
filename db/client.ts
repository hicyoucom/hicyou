import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Disable prefetch as it is not supported for "Transaction" pool mode
// Configure connection pool to prevent max clients error in Supabase
const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1, // Limit connections per instance (important for serverless/dev)
  idle_timeout: 20, // Close idle connections after 20 seconds
  max_lifetime: 60 * 30, // Close connections after 30 minutes
});
export const db = drizzle(client, { schema });
