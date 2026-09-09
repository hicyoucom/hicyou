import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

const database = new URL(
  process.env.DATABASE_URL ?? "postgres://localhost/unused",
);
if (
  process.env.RUN_MIGRATION_TESTS !== "1" ||
  !new Set(["localhost", "127.0.0.1", "[::1]"]).has(database.hostname)
) {
  throw new Error(
    "Use RUN_MIGRATION_TESTS=1 and a disposable local DATABASE_URL with CREATE DATABASE permission",
  );
}
const admin = postgres(database.toString(), { max: 1 });
const names = [];
function migrate(url) {
  return new Promise((resolve, reject) => {
    const processHandle = spawn(process.execPath, ["scripts/migrate.mjs"], {
      env: { ...process.env, DATABASE_URL: url, MIGRATION_DATABASE_URL: url },
    });
    let output = "";
    processHandle.stdout.on("data", (chunk) => {
      output += chunk;
    });
    processHandle.stderr.on("data", (chunk) => {
      output += chunk;
    });
    processHandle.on("error", reject);
    processHandle.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(output)),
    );
  });
}
try {
  for (const extensionSchema of ["public", "extensions"]) {
    const name = `migration_review_${randomUUID().replaceAll("-", "")}`;
    names.push(name);
    await admin.unsafe(`CREATE DATABASE "${name}"`);
    const url = new URL(database);
    url.pathname = `/${name}`;
    const sql = postgres(url.toString(), { max: 1 });
    try {
      if (extensionSchema === "extensions") {
        await sql`CREATE SCHEMA extensions`;
        await sql`CREATE EXTENSION pg_trgm WITH SCHEMA extensions`;
      }
      // Force overlap in fresh schema creation and journal reads.
      const runs = await Promise.allSettled([
        migrate(url.toString()),
        migrate(url.toString()),
      ]);
      for (const run of runs) if (run.status === "rejected") throw run.reason;
      const indexes = await sql`
        select c.relname, i.indisvalid from pg_index i join pg_class c on c.oid = i.indexrelid
        where c.relname like 'bookmarks_public_%' or c.relname in ('bookmarks_featured_created_id_idx', 'categories_name_trgm_idx')`;
      assert.equal(indexes.length, 8);
      assert.ok(indexes.every((index) => index.indisvalid));
      const [operator] = await sql`
        select n.nspname from pg_index i
        join pg_opclass o on o.oid = i.indclass[0]
        join pg_namespace n on n.oid = o.opcnamespace
        where i.indexrelid = 'public.bookmarks_public_title_trgm_idx'::regclass`;
      assert.equal(operator.nspname, extensionSchema);
      // A failed concurrent index build must be repaired on the next start.
      await sql`DROP INDEX public.bookmarks_public_title_trgm_idx`;
      await sql`INSERT INTO bookmarks (title, slug, url) VALUES
        ('Duplicate', 'migration-one', 'https://review.example/one'),
        ('Duplicate', 'migration-two', 'https://review.example/two')`;
      await assert.rejects(
        sql`CREATE UNIQUE INDEX CONCURRENTLY bookmarks_public_title_trgm_idx ON public.bookmarks (title)`,
      );
      const [invalid] =
        await sql`select indisvalid from pg_index where indexrelid = 'public.bookmarks_public_title_trgm_idx'::regclass`;
      assert.equal(invalid.indisvalid, false);
      await migrate(url.toString());
      const [repaired] =
        await sql`select indisvalid, indisunique from pg_index where indexrelid = 'public.bookmarks_public_title_trgm_idx'::regclass`;
      assert.equal(repaired.indisvalid, true);
      assert.equal(repaired.indisunique, false);
      console.log(
        `PASS: ${extensionSchema} extension schema, simultaneous starts and interrupted-index recovery`,
      );
    } finally {
      await sql.end();
    }
  }
} finally {
  for (const name of names)
    await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await admin.end();
}
