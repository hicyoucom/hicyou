# Deployment

HiCyou can run as a Node.js standalone application or as a Docker container. Use a maintained PostgreSQL service and terminate TLS at a reverse proxy or trusted hosting platform.

## Required configuration

Copy `.env.example` and set at least:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_SITE_URL`
- `ADMIN_EMAILS`

Use independent, randomly generated values for secrets. Never bake production `.env` files or `NEXT_PUBLIC_*` values into a reusable image. Values prefixed with `NEXT_PUBLIC_` are embedded during `next build`, so build the production image only in the intended public environment.

Run database migrations before starting a new application revision:

```bash
bun run db:migrate
bun run start
```

The provided container performs strict migrations before starting the server. Keep the application behind a reverse proxy that validates host headers, limits request size, applies timeouts, and overwrites any client IP header configured in `BETTER_AUTH_IP_ADDRESS_HEADERS`.

The application pins user-controlled outbound HTTP requests to DNS answers that have passed its public-address checks. Keep a second, independent network control in production: deny application egress to loopback, RFC 1918, carrier-grade NAT, link-local, multicast, IPv6 ULA/link-local, and cloud metadata ranges. Allow only the explicitly required internal services, such as the configured PostgreSQL host. This limits the impact of future request-layer regressions and must be enforced by the hosting firewall, container network policy, or egress proxy rather than application environment variables.

## Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

The example compose file starts a local PostgreSQL service. Replace its demonstration credentials for any non-local deployment and keep the database port private.

The Compose file is intended for local evaluation and does not implement a production egress firewall. Apply the network policy described above before exposing a self-hosted instance to untrusted submissions or webhook destinations.

The Node and PostgreSQL image tags are paired with reviewed manifest digests. When upgrading an image, update both the readable tag and digest, rebuild, and rerun the complete CI/container scan before deployment.

## Optional services

Email, OAuth, object storage, Turnstile, webhooks, analytics, and AI features are disabled or degraded when their corresponding variables are unset. Configure one feature at a time and use least-privilege credentials.

## Public read performance migration

The performance migration requires `pg_trgm`. Run `bun run db:migrate` using
`MIGRATION_DATABASE_URL` for a direct or session-mode connection when the
application uses transaction pooling. The migration command defaults to
`DATABASE_URL`; port 6543 is rejected to prevent session-lock misuse on a
transaction pooler. The migration role must be allowed to install extensions
and create indexes.

The runner resolves the existing `pg_trgm` schema, including installations in
`extensions`. A session lock covers both phases; nonblocking polling avoids a
waiting lock transaction blocking concurrent index creation.

Transactional schema/function migrations run first. The eight indexes under
`migrations/online/` are then created with `CONCURRENTLY`, outside a transaction.
An advisory lock serializes that phase across application replicas. Reruns skip
valid indexes and retry incomplete index builds. Keep these online files in the
image; the bundled startup command runs both phases before accepting traffic.
For a large existing database, run migrations as a release job before rolling
out application containers. Index builds still consume CPU and I/O.

The homepage, product pages, and category pages use on-demand ISR. Builds do not
connect to the production database or pre-render empty directory pages. Existing
`?search=` URLs are internally rewritten to dynamic search routes. Search terms
are literal substrings, capped at 120 characters; short terms remain supported
with a distributed request budget and a two-second SQL statement timeout.

`R2_PUBLIC_URL` determines the image optimizer allowlist at build time. Without
it, remote optimization is disabled. Publisher and historical admin preview
images use `SafeExternalImage` and remain visible without opening that allowlist.

The sitemap index stays at `/sitemap.xml`. Child XML files under `/sitemaps/`
contain at most 1,000 records each, preserve language alternates, and use actual
update timestamps. Configure the reverse proxy to pass these XML paths through.

See [validation and review](SECURITY_PERFORMANCE_REVIEW.md) for test commands
and the limits of the local benchmark.
