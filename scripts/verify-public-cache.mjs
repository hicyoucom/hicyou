import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import postgres from "postgres";

// This harness writes fixtures and signs a local admin session. It must never
// target a deployed service or a database reached through a remote host.
const local = new Set(["localhost", "127.0.0.1", "[::1]"]);
const base = new URL(process.env.REVIEW_BASE_URL ?? "http://localhost:3000");
const database = new URL(
  process.env.DATABASE_URL ?? "postgres://localhost/unused",
);
if (
  process.env.RUN_WEB_TESTS !== "1" ||
  !local.has(base.hostname) ||
  !local.has(database.hostname) ||
  !process.env.BETTER_AUTH_SECRET ||
  !process.env.CRON_SECRET
) {
  throw new Error(
    "Use RUN_WEB_TESTS=1, local REVIEW_BASE_URL/DATABASE_URL, and the local server's BETTER_AUTH_SECRET/CRON_SECRET",
  );
}
const sql = postgres(database.toString(), { max: 1 });
const prefix = `cache-review-${randomUUID().slice(0, 8)}`;
const token = randomUUID();
const cookie =
  "better-auth.session_token=" +
  encodeURIComponent(
    token +
      "." +
      createHmac("sha256", process.env.BETTER_AUTH_SECRET)
        .update(token)
        .digest("base64"),
  );
let adminId = prefix;
const bookmarkIds = [];
const categoryIds = [];
async function get(path, status = 200) {
  const response = await fetch(new URL(path, base));
  const body = await response.text();
  assert.equal(response.status, status, `${path}: ${body.slice(0, 200)}`);
  return { response, body };
}
async function warm(path) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = await get(path);
    if (result.response.headers.get("x-nextjs-cache") === "HIT") return result;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`ISR did not reach HIT: ${path}`);
}
async function create(items) {
  const response = await fetch(new URL("/api/admin/bookmarks/batch", base), {
    method: "POST",
    headers: {
      origin: base.origin,
      "content-type": "application/json",
      authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({ bookmarks: items }),
  });
  assert.equal(response.status, 200, await response.text());
}
async function patch(id, fields) {
  const response = await fetch(new URL(`/api/bookmarks/${id}`, base), {
    method: "PATCH",
    headers: {
      cookie,
      origin: base.origin,
      "content-type": "application/json",
    },
    body: JSON.stringify(fields),
  });
  assert.equal(response.status, 200, await response.text());
}
try {
  const [existingAdmin] =
    await sql`select id from "user" where email='admin@example.com'`;
  adminId = existingAdmin?.id ?? prefix;
  if (!existingAdmin)
    await sql`insert into "user" (id,name,email,email_verified,created_at,updated_at)
    values (${prefix},'Local cache reviewer','admin@example.com',true,now(),now())`;
  await sql`insert into session (id,token,user_id,expires_at,created_at,updated_at)
    values (${prefix},${token},${adminId},now()+interval '1 hour',now(),now())`;
  await get(`/c/${prefix}-category-1`, 404);
  for (let i = 1; i <= 2; i++) {
    const [category] =
      await sql`insert into categories (name,slug,icon) values (${`${prefix} category ${i}`},${`${prefix}-category-${i}`},'CodeXml') returning id`;
    categoryIds.push(category.id);
  }
  await create(
    [1, 2].map((i) => ({
      title: `${prefix} Before ${i}`,
      url: `https://review.example/${prefix}/${i}`,
      slug: `${prefix}-${i}`,
      description: "Local test fixture",
      overview: "Detailed overview",
      categoryId: categoryIds[i - 1],
    })),
  );
  const initialRows =
    await sql`select id from bookmarks where url like ${`https://review.example/${prefix}/%`} order by id`;
  bookmarkIds.push(...initialRows.map((row) => row.id));
  for (const path of [
    "/",
    "/zh",
    `/${prefix}-1`,
    `/zh/${prefix}-1`,
    `/${prefix}-2`,
    `/c/${prefix}-category-1`,
  ])
    await warm(path);
  console.log(
    "PASS: homepage, detail, category and translated pages reach ISR HIT",
  );
  await patch(bookmarkIds[0], { title: `${prefix} After` });
  assert.ok((await get(`/${prefix}-1`)).body.includes(`${prefix} After`));
  assert.ok((await get(`/zh/${prefix}-1`)).body.includes(`${prefix} After`));
  assert.equal(
    (await get(`/${prefix}-2`)).response.headers.get("x-nextjs-cache"),
    "HIT",
  );
  console.log(
    "PASS: edits refresh both locales and preserve unrelated detail cache",
  );
  await patch(bookmarkIds[0], { slug: `${prefix}-renamed` });
  await get(`/${prefix}-1`, 404);
  await get(`/${prefix}-renamed`);
  await patch(bookmarkIds[0], { isArchived: true });
  await get(`/${prefix}-renamed`, 404);
  const newSlug = `${prefix}-published`;
  await get(`/${newSlug}`, 404);
  await create([
    {
      title: `${prefix} Newly Published`,
      url: `https://review.example/${prefix}/published`,
      slug: newSlug,
    },
  ]);
  await get(`/${newSlug}`);
  console.log("PASS: rename, archive and publishing after a cached 404");
  const search = await get(`/?search=${prefix}`);
  assert.ok(search.body.includes(`${prefix} Newly Published`));
  assert.ok(
    !search.response.headers.get("cache-control")?.includes("s-maxage"),
  );
  const categorySearch = await get(`/c/${prefix}-category-2?search=${prefix}`);
  assert.ok(categorySearch.body.includes(`${prefix} Before 2`));
  assert.ok(
    !categorySearch.response.headers.get("cache-control")?.includes("s-maxage"),
  );
  // The local harness runs alone. HEAD and plain POST must consume the same
  // distributed search budget as GET, even when their results are cached.
  const [budgetBefore] =
    await sql`select coalesce(sum(count), 0)::int as total from rate_limits where action = 'public-search'`;
  for (const method of ["HEAD", "POST"]) {
    const response = await fetch(new URL(`/?search=${prefix}`, base), {
      method,
    });
    assert.equal(response.status, 200);
    await response.text();
  }
  const [budgetAfter] =
    await sql`select coalesce(sum(count), 0)::int as total from rate_limits where action = 'public-search'`;
  assert.equal(budgetAfter.total - budgetBefore.total, 2);
  await get("/?search=a&search=b", 400);
  for (const method of ["GET", "HEAD", "POST"]) {
    const invalid = await fetch(new URL(`/?search=${"a".repeat(121)}`, base), {
      method,
    });
    assert.equal(
      invalid.status,
      400,
      `${method} must enforce search input limits`,
    );
    await invalid.text();
  }
  console.log(
    "PASS: search URLs stay dynamic; duplicate/input limits and GET/HEAD/POST budgets hold",
  );
  const index = await get("/sitemap.xml");
  assert.ok(index.body.includes("/sitemaps/bookmark-"));
  const [published] = await sql`select id from bookmarks where slug=${newSlug}`;
  const shard = await get(
    `/sitemaps/bookmark-${Math.floor(published.id / 1000)}.xml`,
  );
  assert.ok(shard.body.includes(newSlug));
  assert.ok(!shard.body.includes(`${prefix}-renamed</loc>`));
  await get(
    "/_next/image?url=https%3A%2F%2Fexample.com%2Fimage.png&w=640&q=75",
    400,
  );
  console.log(
    "PASS: bounded sitemap contains published URLs; remote optimizer rejects foreign hosts",
  );
} finally {
  await sql`delete from bookmarks where url like ${`https://review.example/${prefix}/%`}`;
  if (categoryIds.length)
    await sql`delete from categories where id in ${sql(categoryIds)}`;
  await sql`delete from session where id=${prefix}`;
  if (adminId === prefix) await sql`delete from "user" where id=${prefix}`;
  await sql.end();
}
