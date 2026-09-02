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

## Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

The example compose file starts a local PostgreSQL service. Replace its demonstration credentials for any non-local deployment and keep the database port private.

## Optional services

Email, OAuth, object storage, Turnstile, webhooks, analytics, and AI features are disabled or degraded when their corresponding variables are unset. Configure one feature at a time and use least-privilege credentials.
