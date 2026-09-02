// OpenAPI 3.1 description of the public Directory API. Served as JSON at
// /api/v1/openapi and rendered at /api/v1/docs. Keep in sync with the routes.
export const SCHEMA_VERSION = "1.0";

const PARAM_CURSOR = {
  name: "cursor",
  in: "query",
  description: "Opaque keyset cursor from a previous `next_cursor`.",
  schema: { type: "string" },
} as const;

const PARAM_LIMIT = {
  name: "limit",
  in: "query",
  description: "Page size (1–500).",
  schema: { type: "integer", default: 100, minimum: 1, maximum: 500 },
} as const;

export const openapiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Hi Cyou Directory API",
    version: SCHEMA_VERSION,
    description:
      "Read-only API to sync directory products from Hi Cyou. Token-authed, incremental. " +
      "See the consumer guide for the full sync recipe.",
  },
  servers: [{ url: "https://hicyou.com/api/v1" }],
  security: [{ bearerAuth: [] }],
  paths: {
    "/meta": {
      get: {
        summary: "Service metadata + your rate-limit budget",
        responses: { "200": { description: "OK" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/products": {
      get: {
        summary: "List products (incremental, keyset-paginated)",
        parameters: [
          { name: "updated_since", in: "query", description: "Only rows with updated_at >= this (ISO 8601).", schema: { type: "string", format: "date-time" } },
          PARAM_CURSOR,
          PARAM_LIMIT,
          { name: "status", in: "query", description: "Only `published` is supported.", schema: { type: "string", default: "published" } },
          { name: "category", in: "query", description: "Filter by category slug.", schema: { type: "string" } },
          { name: "locale", in: "query", description: "CSV of locales to include in the i18n block, e.g. `en-US,zh-CN`.", schema: { type: "string" } },
          { name: "include", in: "query", description: "CSV of `alternatives,key_features,faqs,use_cases,tags`.", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Product" } },
                    next_cursor: { type: ["string", "null"] },
                    server_time: { type: "string", format: "date-time" },
                    meta: { type: "object" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/search": {
      get: {
        summary: "Substring search over product name/tagline/description",
        parameters: [
          { name: "q", in: "query", required: true, description: "Search term (min 2 chars).", schema: { type: "string", minLength: 2 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, minimum: 1, maximum: 100 } },
          { name: "locale", in: "query", schema: { type: "string" } },
          { name: "include", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Product" } }, query: { type: "string" }, returned: { type: "integer" } } } } } },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/export": {
      get: {
        summary: "Stream all published products as NDJSON (one product per line)",
        parameters: [
          { name: "include", in: "query", schema: { type: "string" } },
          { name: "locale", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "NDJSON stream", content: { "application/x-ndjson": { schema: { $ref: "#/components/schemas/Product" } } } },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/products/{slug}": {
      get: {
        summary: "Get one product",
        parameters: [
          { name: "slug", in: "path", required: true, schema: { type: "string" } },
          { name: "include", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Product" } } } } } },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/categories": { get: { summary: "List all categories", parameters: [{ name: "locale", in: "query", schema: { type: "string" } }], responses: { "200": { description: "OK" }, "401": { $ref: "#/components/responses/Unauthorized" } } } },
    "/tags": { get: { summary: "List all tags", responses: { "200": { description: "OK" }, "401": { $ref: "#/components/responses/Unauthorized" } } } },
    "/changes": {
      get: {
        summary: "Change feed (upserts + delete tombstones) — the sync channel",
        parameters: [
          { name: "since", in: "query", required: true, description: "ISO 8601.", schema: { type: "string", format: "date-time" } },
          PARAM_CURSOR,
          PARAM_LIMIT,
          { name: "locale", in: "query", description: "CSV of locales to include in each upsert product's i18n block.", schema: { type: "string" } },
          { name: "include", in: "query", description: "CSV of `alternatives,key_features,faqs,use_cases`. Tags are always present.", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/ChangeEntry" } }, next_cursor: { type: ["string", "null"] }, server_time: { type: "string", format: "date-time" }, meta: { type: "object" } } } } },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", description: "`Authorization: Bearer hcy_live_…`. A non-empty User-Agent is also required." },
    },
    responses: {
      Unauthorized: { description: "Missing/invalid token or User-Agent", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      NotFound: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      ValidationError: { description: "Invalid parameter", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      RateLimited: { description: "Rate limit exceeded. The Retry-After response header contains seconds to wait.", headers: { "Retry-After": { description: "Seconds until retry.", schema: { type: "integer", minimum: 0 } } }, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              retry_after: {
                type: "number",
                minimum: 0,
                description: "Present for rate-limited responses; seconds until retry.",
              },
            },
            required: ["code", "message"],
          },
        },
      },
      Product: {
        type: "object",
        properties: {
          slug: { type: "string" },
          domain: { type: ["string", "null"] },
          url: { type: "string" },
          name: { type: "string" },
          tagline: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          logo_url: { type: ["string", "null"] },
          screenshot_url: { type: ["string", "null"] },
          og_image_url: { type: ["string", "null"] },
          pricing_model: { type: "string" },
          is_dofollow: { type: "boolean" },
          category: { type: ["object", "null"], properties: { slug: { type: "string" }, name: { type: "string" } } },
          categories: { type: "array", items: { type: "object", properties: { slug: { type: "string" }, name: { type: "string" }, primary: { type: "boolean" } }, required: ["slug", "name", "primary"] } },
          tags: { type: "array", items: { type: "string" } },
          alternatives: { type: "array", items: { type: "string" } },
          key_features: { type: "array" },
          use_cases: { type: "array", items: { type: "string" } },
          faqs: { type: "array" },
          why_startups: { type: ["string", "null"] },
          i18n: { type: "object" },
          published_at: { type: ["string", "null"], format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
          deleted_at: { type: ["string", "null"], format: "date-time" },
          source: { type: "string", enum: ["hicyou"] },
          source_id: { type: "integer", description: "Stable bookmarks.id — key local rows on this." },
        },
        required: ["slug", "url", "name", "category", "categories", "tags", "updated_at", "source", "source_id"],
      },
      ChangeEntry: {
        oneOf: [
          { type: "object", properties: { type: { const: "upsert" }, slug: { type: "string" }, updated_at: { type: "string" }, product: { $ref: "#/components/schemas/Product" } }, required: ["type", "slug", "updated_at", "product"] },
          { type: "object", properties: { type: { const: "delete" }, slug: { type: "string" }, source_id: { type: "integer" }, deleted_at: { type: "string" } }, required: ["type", "slug", "source_id", "deleted_at"] },
        ],
      },
    },
  },
} as const;
