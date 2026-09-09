import { readFile, readdir } from "node:fs/promises";

/** Concurrent index creation cannot run inside Drizzle's migration transaction.
 * The caller holds the migration session lock across both phases. Failed builds leave
 * invalid indexes: drop only those owned by these migrations before retrying. */
export async function applyOnlineIndexes(client) {
  const [extension] = await client`
    select format('%I.gin_trgm_ops', n.nspname) as opclass
    from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm'`;
  if (!extension)
    throw new Error("pg_trgm must be installed before online indexes");
  // Managed databases may already have pg_trgm in an extensions schema that
  // is absent from the migration role's search_path. Qualify its operator class.

  for (const file of (
    await readdir(new URL("../migrations/online/", import.meta.url))
  )
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    const contents = await readFile(
      new URL(`../migrations/online/${file}`, import.meta.url),
      "utf8",
    );
    for (const statement of contents
      .split("--> statement-breakpoint")
      .map((value) => value.trim())
      .filter(Boolean)) {
      const match =
        /^CREATE INDEX CONCURRENTLY IF NOT EXISTS "([a-z0-9_]+)"/.exec(
          statement,
        );
      if (!match)
        throw new Error(`Unsupported online migration statement in ${file}`);
      const name = match[1];
      const [existing] = await client`
          select i.indisvalid from pg_index i join pg_class c on c.oid = i.indexrelid
          join pg_namespace n on n.oid = c.relnamespace where c.relname = ${name} and n.nspname = 'public'`;
      if (existing?.indisvalid) continue;
      if (existing)
        await client.unsafe(`DROP INDEX CONCURRENTLY "public"."${name}"`);
      await client.unsafe(
        statement.replace(/\bgin_trgm_ops\b/g, () => extension.opclass),
      );
    }
  }
}
