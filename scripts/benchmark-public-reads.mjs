import postgres from "postgres";

const url = new URL(process.env.DATABASE_URL ?? "postgres://localhost/unused");
if (
  process.env.RUN_DB_BENCHMARK !== "1" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
) {
  throw new Error(
    "Set RUN_DB_BENCHMARK=1 and DATABASE_URL to a disposable local database",
  );
}
const sql = postgres(url.toString(), { max: 1 });
const rollback = new Error("rollback benchmark fixtures");
const evidence = {};
function indexes(plan, result = []) {
  if (plan["Index Name"]) result.push(plan["Index Name"]);
  for (const child of plan.Plans ?? []) indexes(child, result);
  return [...new Set(result)];
}
try {
  await sql.begin(async (tx) => {
    await tx`insert into bookmarks (url,slug,title,description,overview,status,is_favorite,created_at)
      select 'https://benchmark.example/' || i, 'benchmark-tool-' || i,
        'Benchmark tool ' || i, 'Synthetic directory description ' || i,
        repeat(md5(i::text), 80) || case when i = 13337 then ' quartzneedle ' else '' end,
        case when i % 20 = 0 then 'draft' else 'published' end, i % 100 = 0,
        now() - i * interval '1 minute' from generate_series(1, 50000) i`;
    // Flush freshly inserted GIN pending lists before comparing read plans.
    // A just-filled pending list represents bulk ingestion, not steady-state search.
    for (const name of [
      "bookmarks_public_title_trgm_idx",
      "bookmarks_public_description_trgm_idx",
      "bookmarks_public_overview_trgm_idx",
    ])
      await tx`select gin_clean_pending_list(${name}::regclass)`;
    await tx`analyze bookmarks`;
    const queries = {
      search: `select b.id, b.title from bookmarks b where b.status='published' and b.is_archived=false and b.deleted_at is null and b.id in (
        select id from bookmarks where status='published' and is_archived=false and deleted_at is null and
          (title ilike '%quartzneedle%' or description ilike '%quartzneedle%' or overview ilike '%quartzneedle%')
        union select b.id from bookmarks b join categories c on c.id=b.category_id where c.name ilike '%quartzneedle%'
        union select bc.bookmark_id from bookmark_categories bc join categories c on c.id=bc.category_id where c.status='active' and c.name ilike '%quartzneedle%'
      ) order by b.created_at desc nulls last,b.id desc nulls last limit 50`,
      latest:
        "select id,title from bookmarks where status='published' and is_archived=false and deleted_at is null order by created_at desc nulls last,id desc nulls last limit 30",
    };
    for (const phase of ["withNewIndexes", "withoutNewIndexes"]) {
      if (phase === "withoutNewIndexes") {
        const owned =
          await tx`select indexname from pg_indexes where schemaname='public' and indexname in (
          'bookmarks_public_created_id_idx','bookmarks_public_id_idx','bookmarks_public_updated_id_idx',
          'bookmarks_featured_created_id_idx','bookmarks_public_title_trgm_idx','bookmarks_public_description_trgm_idx',
          'bookmarks_public_overview_trgm_idx','categories_name_trgm_idx')`;
        for (const { indexname } of owned)
          await tx.unsafe(`drop index "${indexname}"`);
      }
      evidence[phase] = {};
      for (const [name, query] of Object.entries(queries)) {
        // Two warm runs reduce first-read noise; keep both measurements.
        evidence[phase][name] = [];
        for (let run = 0; run < 2; run++) {
          const [row] = await tx.unsafe(
            `explain (analyze,buffers,format json) ${query}`,
          );
          const result = row["QUERY PLAN"][0];
          evidence[phase][name].push({
            milliseconds: result["Execution Time"],
            indexes: indexes(result.Plan),
            rows: result.Plan["Actual Rows"],
          });
        }
      }
    }
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) throw error;
} finally {
  await sql.end();
}
console.log(JSON.stringify({ syntheticRows: 50000, ...evidence }, null, 2));
