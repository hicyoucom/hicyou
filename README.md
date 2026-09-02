# HiCyou

HiCyou is a self-hosted, multilingual directory for software products and online resources. It is built with Next.js 16, React 19, PostgreSQL, Drizzle ORM, Better Auth, and Bun.

This repository contains the community-safe HiCyou core. Production data, private deployment settings, partner integrations, historical operating documents, and private Git history are intentionally not part of this distribution.

## Features

- Multilingual home, product, category, tag, collection, and search pages
- Product submission, moderation, status tracking, and abuse protection
- Better Auth accounts and administrator access controls
- Content generation, translation, quality review, and automatic collections
- Read-only v1 API, API tokens, webhooks, and bounded cron jobs
- Optional email, R2-compatible storage, Turnstile, and AI providers
- PostgreSQL migrations, tests, standalone Next.js output, and Docker deployment

## Requirements

- Bun 1.4 or Node.js 22+
- PostgreSQL 15+

## Local setup

```bash
git clone https://github.com/hicyoucom/hicyou.git
cd hicyou
cp .env.example .env
bun install --frozen-lockfile
bun run db:migrate
bun run dev
```

Before the first migration, set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` in `.env`. Optional services can remain unset. Open <http://localhost:3000> after the development server starts.

Useful checks:

```bash
bun run lint
bun run typecheck
bun test
bun run build
```

See [deployment](docs/DEPLOYMENT.md) for production guidance and [the v1 migration guide](docs/MIGRATING_FROM_V1.md) before upgrading an existing installation.

## License and attribution

HiCyou contributions in this distribution are provided under the [Apache License 2.0](LICENSE). The project contains code derived from 9d8's MIT-licensed Directory project; its original notice and license are retained in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

If HiCyou helps your project, you are welcome to keep a “Powered by HiCyou” badge and link to <https://hicyou.com>. This attribution is entirely optional and is not a condition of the Apache-2.0 license. See [BRAND.md](BRAND.md) for trademark and badge guidance.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Please report vulnerabilities through the private process in [SECURITY.md](SECURITY.md), not a public issue.
