#!/usr/bin/env node

import postgres from "postgres";

const argumentsSet = new Set(process.argv.slice(2));
const dryRun = argumentsSet.has("--dry-run");
const backupConfirmed = argumentsSet.has("--backup-confirmed");
const allowedArguments = new Set(["--dry-run", "--backup-confirmed"]);

if ([...argumentsSet].some((argument) => !allowedArguments.has(argument))) {
  throw new Error("usage: migrate-v1-to-v2.mjs --dry-run | --backup-confirmed");
}
if (dryRun === backupConfirmed) {
  throw new Error("choose exactly one mode: --dry-run or --backup-confirmed");
}

const sourceUrl = process.env.V1_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;
if (!sourceUrl || !targetUrl) {
  throw new Error("V1_DATABASE_URL and DATABASE_URL are required");
}
if (sourceUrl === targetUrl) {
  throw new Error("v1 source and v2 target databases must be different");
}

const source = postgres(sourceUrl, {
  max: 1,
  prepare: false,
  connect_timeout: 30,
});
const target = postgres(targetUrl, {
  max: 1,
  prepare: false,
  connect_timeout: 30,
});
const batchSize = 500;

function countValue(rows) {
  return Number(rows[0]?.count ?? 0);
}

async function requireTables(sql, names, label) {
  const rows = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_name = any(${names})
  `;
  const existing = new Set(rows.map((row) => row.table_name));
  const missing = names.filter((name) => !existing.has(name));
  if (missing.length)
    throw new Error(
      `${label} database is missing required tables: ${missing.join(", ")}`,
    );
}

async function sourceCounts() {
  const [categories, bookmarks, submissions, profiles] = await Promise.all([
    source`select count(*)::int as count from categories`,
    source`select count(*)::int as count from bookmarks`,
    source`select count(*)::int as count from submissions`,
    source`select count(*)::int as count from profiles`,
  ]);
  return {
    categories: countValue(categories),
    bookmarks: countValue(bookmarks),
    submissions: countValue(submissions),
    skippedProfiles: countValue(profiles),
  };
}

async function assertEmptyTarget() {
  const [categories, bookmarks, submissions, users] = await Promise.all([
    target`select count(*)::int as count from categories`,
    target`select count(*)::int as count from bookmarks`,
    target`select count(*)::int as count from submissions`,
    target`select count(*)::int as count from "user"`,
  ]);
  const counts = {
    categories: countValue(categories),
    bookmarks: countValue(bookmarks),
    submissions: countValue(submissions),
    users: countValue(users),
  };
  if (Object.values(counts).some((count) => count !== 0)) {
    throw new Error(
      "v2 target content/authentication tables must be empty before migration",
    );
  }
}

async function readCategories(afterId) {
  return source`
    select id, name, description, slug, color, icon, sort_order, created_at, updated_at
    from categories
    where id > ${afterId}
    order by id
    limit ${batchSize}
  `;
}

async function readBookmarks(afterId) {
  return source`
    select id, url, title, slug, description, category_id, tags, favicon, screenshot,
      overview, why_startups, alternatives, pricing_type, og_image, og_title,
      og_description, created_at, updated_at, last_visited, notes, is_archived,
      is_favorite, is_dofollow, search_results, key_features, use_cases, faqs
    from bookmarks
    where id > ${afterId}
    order by id
    limit ${batchSize}
  `;
}

async function readSubmissions(afterId) {
  return source`
    select id, url, title, tagline, description, category_id, why_startups,
      alternatives, pricing_type, logo, cover, submitter_email, submitter_name,
      has_badge, badge_verified, badge_verified_at, backlink_verified,
      backlink_verified_at, is_dofollow, publish_at, status, created_at,
      updated_at, key_features, use_cases, faqs
    from submissions
    where id > ${afterId}
    order by id
    limit ${batchSize}
  `;
}

async function insertInBatches(tx, reader, transform, tableName, columns) {
  let afterId = 0;
  let inserted = 0;
  for (;;) {
    const rows = await reader(afterId);
    if (rows.length === 0) break;
    const values = rows.map(transform);
    if (tableName === "categories")
      await tx`insert into categories ${tx(values, columns)}`;
    else if (tableName === "bookmarks")
      await tx`insert into bookmarks ${tx(values, columns)}`;
    else if (tableName === "submissions")
      await tx`insert into submissions ${tx(values, columns)}`;
    else throw new Error("unsupported migration table");
    afterId = Number(rows.at(-1).id);
    inserted += rows.length;
  }
  return inserted;
}

try {
  await source`set default_transaction_read_only = on`;
  await requireTables(
    source,
    ["categories", "bookmarks", "submissions", "profiles"],
    "v1 source",
  );
  await requireTables(
    target,
    ["categories", "bookmarks", "bookmark_categories", "submissions", "user"],
    "v2 target",
  );
  await assertEmptyTarget();
  const counts = await sourceCounts();

  console.log("v1 migration assessment", counts);
  console.log(
    "Authentication credentials and profile ownership will not be migrated.",
  );
  if (dryRun) {
    console.log("Dry run complete; no target rows were written.");
  } else {
    const migrated = await target.begin("read write", async (tx) => {
      const categories = await insertInBatches(
        tx,
        readCategories,
        (row) => ({ ...row, group_key: "work", status: "active" }),
        "categories",
        [
          "id",
          "name",
          "description",
          "slug",
          "color",
          "icon",
          "group_key",
          "status",
          "sort_order",
          "created_at",
          "updated_at",
        ],
      );
      const bookmarks = await insertInBatches(
        tx,
        readBookmarks,
        (row) => ({
          ...row,
          status: row.is_archived ? "archived" : "published",
          published_at: row.is_archived ? null : row.created_at,
          deleted_at: null,
        }),
        "bookmarks",
        [
          "id",
          "url",
          "title",
          "slug",
          "description",
          "category_id",
          "tags",
          "favicon",
          "screenshot",
          "overview",
          "why_startups",
          "alternatives",
          "pricing_type",
          "og_image",
          "og_title",
          "og_description",
          "created_at",
          "updated_at",
          "last_visited",
          "status",
          "published_at",
          "deleted_at",
          "notes",
          "is_archived",
          "is_favorite",
          "is_dofollow",
          "search_results",
          "key_features",
          "use_cases",
          "faqs",
        ],
      );
      await tx`
        insert into bookmark_categories (bookmark_id, category_id, position, source)
        select id, category_id, 0, 'v1-migration'
        from bookmarks
        where category_id is not null
      `;
      const submissions = await insertInBatches(
        tx,
        readSubmissions,
        (row) => ({ ...row, user_id: null, submitter_ip: null }),
        "submissions",
        [
          "id",
          "url",
          "title",
          "tagline",
          "description",
          "category_id",
          "user_id",
          "why_startups",
          "alternatives",
          "pricing_type",
          "logo",
          "cover",
          "submitter_email",
          "submitter_name",
          "submitter_ip",
          "has_badge",
          "badge_verified",
          "badge_verified_at",
          "backlink_verified",
          "backlink_verified_at",
          "is_dofollow",
          "publish_at",
          "status",
          "created_at",
          "updated_at",
          "key_features",
          "use_cases",
          "faqs",
        ],
      );
      await tx`select setval(pg_get_serial_sequence('categories', 'id'), greatest(coalesce((select max(id) from categories), 1), 1), true)`;
      await tx`select setval(pg_get_serial_sequence('bookmarks', 'id'), greatest(coalesce((select max(id) from bookmarks), 1), 1), true)`;
      await tx`select setval(pg_get_serial_sequence('submissions', 'id'), greatest(coalesce((select max(id) from submissions), 1), 1), true)`;
      return {
        categories,
        bookmarks,
        submissions,
        skippedProfiles: counts.skippedProfiles,
      };
    });
    console.log("v1 migration complete", migrated);
  }
} catch (error) {
  console.error(
    "v1 migration failed",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exitCode = 1;
} finally {
  await Promise.allSettled([source.end(), target.end()]);
}
