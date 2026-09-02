# Digest pins are intentionally paired with readable tags. Update the digest
# only after CI and the container vulnerability scan pass for the new image.
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS base
ARG BUN_VERSION=1.4.0
RUN apk add --no-cache libc6-compat \
  && npm install --global --no-audit --no-fund "bun@${BUN_VERSION}"

FROM base AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --network-concurrency 8

FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS migration-dependencies
WORKDIR /migrate
RUN npm install --omit=dev --no-package-lock drizzle-orm@0.45.2 postgres@3.4.9

FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS runner
WORKDIR /app
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  HOSTNAME=0.0.0.0 \
  PORT=3000
RUN apk upgrade --no-cache libcrypto3 libssl3 \
  && rm -r /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-v1.22.22 \
  && rm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=migration-dependencies --chown=nextjs:nodejs /migrate/node_modules ./scripts/node_modules
COPY --from=builder /app/LICENSE /app/NOTICE /app/THIRD_PARTY_LICENSES.md /usr/share/licenses/hicyou/
USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
