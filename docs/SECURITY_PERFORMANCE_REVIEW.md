# Security and public read performance review

This change closes the unrestricted remote-image optimizer allowlist and reduces
public rendering, search, cache invalidation, and sitemap costs. It does not
change API authorization or contact production services during validation.

## Behavior

- Owned R2 images may use the optimizer; arbitrary publisher images use the
  existing browser image component, including admin previews. Optimizer redirects
  are disabled. Product covers request eager/high-priority loading; other images
  retain lazy loading.
- Homepage, product detail, category and category pagination pages use on-demand
  ISR. Search keeps its existing query-string URLs through internal rewrites and
  explicitly renders dynamically. Locale setup runs before translation reads.
- Product edits invalidate the entity, matching translations, affected sitemap
  bucket, and public/admin lists. Counts and related membership change only when
  visibility or category assignments change. Renames invalidate old/new paths in
  every locale. Bulk publishing also clears cached 404s. Related-product reads
  carry the tags of their actual returned products.
- Search caches normalized keywords for 60 seconds, escapes LIKE metacharacters,
  retains substring matching (including short terms), and limits query length,
  request frequency and SQL execution time. Text and category matches use a
  union so their indexes can work independently. Public API search keeps its
  existing authentication/rate budgets and receives length/SQL-time limits too.
- Four public B-tree indexes support latest/featured lists, ID-range sitemap
  reads, and updated-at cursor reads. Three partial trigram GIN indexes cover
  title, description and overview; another GIN index covers category names.
- Public cards retrieve a maximum 320-character overview fallback when a
  description is absent. Full detail and admin edit data remain intact. List
  translation queries omit nested detail fields and bound overview text.
- Translation work selection returns IDs, and remaining-work queries return a
  count. PostgreSQL checks the same scalar/nested field names and whitespace
  rules as the translation writer; long source documents stay in the database.
- Sitemap XML is partitioned into occupied ID ranges, at most 1,000 rows per
  child. Cache invalidation targets the relevant product bucket. No invented
  modification timestamp is emitted.
- Public icons use explicit imports for all picker choices and legacy aliases.
  Unknown imported names show a fallback instead of loading the full registry.
  Auth, submission and badge translations ship only in their route providers.
  The unused remote image import module was removed.

## Validation

Run repository checks with the example environment pointing to a disposable
PostgreSQL database:

```sh
bun run db:migrate
bun run db:migrate
bun run lint
bun run typecheck
RUN_DB_TESTS=1 bun test
bun run build
bun run open-source:check
```

The integration suite verifies search visibility, literal wildcard matching,
bounded list summaries, and parity between SQL translation completeness and the
writer, including malformed historical JSON and Unicode whitespace.

The runtime harness must target a local server built from this revision, using
the same local database and auth/cron secrets. Set `ADMIN_EMAILS=admin@example.com`
on that server. Use `localhost` for local Next.js binding: explicit `127.0.0.1`
binding has an [upstream rewrite normalization issue](https://github.com/vercel/next.js/issues/94745) in this Next.js release.
The harness creates and removes only its own fixtures.

```sh
RUN_WEB_TESTS=1 REVIEW_BASE_URL=http://localhost:3000 node scripts/verify-public-cache.mjs
RUN_DB_BENCHMARK=1 node scripts/benchmark-public-reads.mjs
```

Both scripts reject non-loopback database hosts. The runtime harness checks ISR
HITs, multilingual edits, unrelated detail cache retention, renames, archiving,
publishing after a cached product/category 404, search rewrites, sitemap output and image-host
rejection. The benchmark inserts 50,000 synthetic records, measures plans with
and without the new indexes, then rolls back fixtures and index changes.

The final revision passed 212 unit/integration tests (699 assertions), lint,
TypeScript, production build without a database, fresh and repeated migrations,
and the public-boundary check. The runtime harness passed against both Next.js
production mode and the standalone Docker image. Desktop/mobile browser checks
passed for search navigation, eager cover loading, viewport width, hydration and
route-specific translations.

## Measurement limits

For the v2 build checked in this review, the icon registry plus loader manifest
appeared in all three measured route dependency lists. This differs from the
previous report's artifact; these figures describe the artifacts compared here.
The static map still has a cost, so the table measures complete route first-load
JavaScript, summing `gzip -c` output for each `firstLoadChunkPaths` entry in
`.next/diagnostics/route-bundle-stats.json` (bytes):

| Route                |  Before |   After | Reduction |
| -------------------- | ------: | ------: | --------: |
| `/[locale]`          | 307,313 | 265,027 |    42,286 |
| `/[locale]/[slug]`   | 309,581 | 267,557 |    42,024 |
| `/[locale]/c/[slug]` | 308,043 | 265,962 |    42,081 |

These totals include shared chunks; they are cold first-load costs per route,
not additive costs when navigating between pages. Route-scoped message savings
are in the HTML/RSC payload and are not included in the JavaScript table.

Local steady-state search measurements on 50,000 synthetic records were about
892 ms without the new indexes and 6.5 ms with them. The benchmark flushes GIN
pending lists after bulk insertion before measuring; fresh ingestion and real
production distributions can yield different plans and timings. A one-character
substring is still inherently expensive and is bounded by the request budget
and statement timeout rather than a promised trigram speedup.

No production DDL, production load tests or deployment are performed by this
review. Apply migrations before deploying the application. On multiple isolated
self-hosted replicas, use a shared Next.js cache/invalidation backend or accept
the configured TTL; process-local caches cannot provide cross-replica immediate
invalidation by themselves.

## Second review

A second pass reproduced and fixed four additional edge cases:

- **P1, migration startup race:** two simultaneous fresh migration processes
  raced while creating Drizzle's schema/journal. The session lock now covers
  both transactional migrations and online indexes. Lock acquisition polls
  `pg_try_advisory_lock`; a blocking lock SELECT can retain a transaction that
  concurrent index creation waits for, creating a deadlock. Connection lifetime
  rotation is disabled for this session.
- **P1, existing extension schema:** with `pg_trgm` already installed under
  `extensions` and absent from `search_path`, startup failed because
  `gin_trgm_ops` could not be resolved. The runner now discovers the extension
  namespace and safely qualifies its operator class.
- **P2, search budget bypass:** HEAD and plain POST requests could render search
  pages while bypassing the GET-only validation and rate limit. The same checks
  now cover all methods that reach these pages.
- **P2, repeated query parameters:** `?search=a&search=b` reached rendering as an
  array and returned 500. The proxy now rejects repeated search parameters with
  400 before rendering.

The migration regression harness creates disposable databases, checks both
extension locations, runs simultaneous migration processes, deliberately leaves
an INVALID index from a failed concurrent build, verifies recovery, and removes
its databases. It requires a local PostgreSQL role with CREATE DATABASE rights:

```sh
RUN_MIGRATION_TESTS=1 node scripts/verify-migrations.mjs
```

The HTTP harness additionally checks repeated parameters, GET/HEAD/POST length
limits and that valid HEAD/POST searches increment the shared request budget.
The suspected tag-edit/detail-cache issue was excluded after tracing call sites:
the product page does not read product tags, so no tag-cache change was made.

## Merge checks

GitHub's dependency scan identified [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c)
in sharp 0.35.3. The dependency and lockfile now pin the fixed 0.35.4 release.
The migration CLI also validates the configured PostgreSQL URL explicitly,
rejecting missing/malformed targets, unsupported protocols and transaction-pooler
connections before opening a database client. Invalid URL diagnostics omit the
configured value to avoid logging credentials.
