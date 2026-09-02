import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  smallint,
  json,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Shapes for the AI-generated JSON columns. keyFeatures historically holds
// either plain strings or { name, description } objects, so the union keeps
// both legacy and current rows valid.
export type KeyFeature = string | { name: string; description?: string };
export type Faq = { question: string; answer: string };

// Better Auth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Profiles table (extends Better Auth user)
export const profiles = pgTable("profiles", {
  id: text("id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  email: text("email"),
  name: text("name"), // User's display name
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories table
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    slug: text("slug").notNull().unique(),
    color: text("color"), // For UI customization
    icon: text("icon"), // For UI customization
    groupKey: text("group_key").notNull().default("work"),
    status: text("status").notNull().default("active"), // draft | active | archived
    sortOrder: integer("sort_order").notNull().default(0), // For ordering categories
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    check(
      "categories_group_key_check",
      sql`${t.groupKey} in ('ai', 'build', 'work', 'growth', 'life', 'other')`,
    ),
    check(
      "categories_status_check",
      sql`${t.status} in ('draft', 'active', 'archived')`,
    ),
  ],
);

// Bookmarks table
export const bookmarks = pgTable(
  "bookmarks",
  {
    // Core fields
    id: serial("id").primaryKey(),
    url: text("url").notNull().unique(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"), // Tagline

    // Organization
    categoryId: integer("category_id").references(() => categories.id),
    tags: text("tags"), // Comma-separated tags

    // Metadata
    favicon: text("favicon"), // Logo Image URL
    screenshot: text("screenshot"), // URL to a screenshot
    overview: text("overview"), // Description
    whyStartups: text("why_startups"), // Why do startups need this tool?
    alternatives: text("alternatives"), // Comma-separated list of alternative tools
    pricingType: text("pricing_type").notNull().default("Paid"), // Pricing

    // SEO and sharing
    ogImage: text("og_image"), // Cover Image URL
    ogTitle: text("og_title"), // Open Graph title
    ogDescription: text("og_description"), // Open Graph description

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastVisited: timestamp("last_visited"),

    // Public API lifecycle (consumed by /api/v1). `status` is the public-facing
    // lifecycle; `isArchived` stays as the legacy admin flag and is kept in sync.
    status: text("status").notNull().default("published"), // 'published' | 'draft' | 'archived'
    publishedAt: timestamp("published_at"),
    deletedAt: timestamp("deleted_at"), // soft delete — consumers sync the removal

    // User data
    notes: text("notes"), // Personal notes
    isArchived: boolean("is_archived").notNull().default(false),
    isFavorite: boolean("is_favorite").notNull().default(false),
    isDofollow: boolean("is_dofollow").notNull().default(false),
    search_results: text("search_results"),

    // AI Generated Content
    keyFeatures: json("key_features").$type<KeyFeature[]>(), // Array of strings or objects
    useCases: json("use_cases").$type<string[]>(), // Array of strings
    faqs: json("faqs").$type<Faq[]>(), // Array of { question: string, answer: string }
  },
  (t) => [
    index("bookmarks_category_id_idx").on(t.categoryId),
    index("bookmarks_is_favorite_idx").on(t.isFavorite),
    index("bookmarks_created_at_idx").on(t.createdAt),
    // Public API incremental sync: list by (updated_at, id) keyset, plus the
    // delete channel reads deleted_at.
    index("bookmarks_updated_at_idx").on(t.updatedAt),
    index("bookmarks_deleted_at_idx").on(t.deletedAt),
    index("bookmarks_status_idx").on(t.status),
    // Slug-collision lookups (generateUniqueSlug) use LIKE 'base-%'; a plain
    // btree can't serve prefix LIKE under a non-C collation, text_pattern_ops can.
    index("bookmarks_slug_pattern_idx").on(t.slug.op("text_pattern_ops")),
  ],
);

// Bookmark-Category assignments. `position = 0` is the primary category;
// positions 1 and 2 are optional discovery categories. The pair of DB
// constraints makes duplicate categories and more than three assignments
// impossible even if two write paths race.
export const bookmarkCategories = pgTable(
  "bookmark_categories",
  {
    bookmarkId: integer("bookmark_id")
      .notNull()
      .references(() => bookmarks.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    position: smallint("position").notNull(),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.bookmarkId, t.categoryId] }),
    uniqueIndex("bookmark_categories_bookmark_position_unique").on(
      t.bookmarkId,
      t.position,
    ),
    index("bookmark_categories_category_bookmark_idx").on(
      t.categoryId,
      t.bookmarkId,
    ),
    check(
      "bookmark_categories_position_check",
      sql`${t.position} between 0 and 2`,
    ),
  ],
);

// Submissions table
export const submissions = pgTable(
  "submissions",
  {
    id: serial("id").primaryKey(),
    url: text("url").notNull().unique(),
    title: text("title").notNull(),
    tagline: text("tagline"),
    description: text("description"),
    categoryId: integer("category_id").references(() => categories.id),

    // User association
    userId: text("user_id").references(() => profiles.id, {
      onDelete: "set null",
    }), // Link to Better Auth user (via profiles)

    // Additional content
    whyStartups: text("why_startups"),
    alternatives: text("alternatives"),
    pricingType: text("pricing_type").notNull().default("Paid"),

    // Images
    logo: text("logo"),
    cover: text("cover"),

    // Submitter information
    submitterEmail: text("submitter_email"),
    submitterName: text("submitter_name"),
    submitterIp: text("submitter_ip"),

    // Badge verification
    hasBadge: boolean("has_badge").notNull().default(false),
    badgeVerified: boolean("badge_verified").notNull().default(false),
    badgeVerifiedAt: timestamp("badge_verified_at"),

    // Backlink verification
    backlinkVerified: boolean("backlink_verified").notNull().default(false),
    backlinkVerifiedAt: timestamp("backlink_verified_at"),

    // Dofollow status
    isDofollow: boolean("is_dofollow").notNull().default(false),

    // Auto-publish timing
    publishAt: timestamp("publish_at"),

    // Status
    status: text("status").notNull().default("pending"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

    // AI Generated Content
    keyFeatures: json("key_features").$type<KeyFeature[]>(),
    useCases: json("use_cases").$type<string[]>(),
    faqs: json("faqs").$type<Faq[]>(),
  },
  (t) => [
    index("submissions_category_id_idx").on(t.categoryId),
    // Drives the daily auto-publish cron: WHERE status=... AND publish_at <= now()
    index("submissions_status_publish_idx").on(t.status, t.publishAt),
    // Per-IP submission rate limiting: WHERE submitter_ip = ? AND created_at >= ?
    index("submissions_submitter_ip_created_idx").on(
      t.submitterIp,
      t.createdAt,
    ),
    // Admin conversion reporting scopes all aggregates by submission cohort.
    index("submissions_created_at_idx").on(t.createdAt),
    // Status-center pages scope by owner and render in reverse submission order.
    // The partial predicate avoids indexing legacy submissions without an owner.
    index("submissions_user_created_idx")
      .on(t.userId, t.createdAt, t.id)
      .where(sql`${t.userId} IS NOT NULL`),
  ],
);

// Preserve the categories requested by a submitter until review/publish.
// Uses the same ordering contract as bookmarkCategories.
export const submissionCategories = pgTable(
  "submission_categories",
  {
    submissionId: integer("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    position: smallint("position").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.submissionId, t.categoryId] }),
    uniqueIndex("submission_categories_submission_position_unique").on(
      t.submissionId,
      t.position,
    ),
    index("submission_categories_category_submission_idx").on(
      t.categoryId,
      t.submissionId,
    ),
    check(
      "submission_categories_position_check",
      sql`${t.position} between 0 and 2`,
    ),
  ],
);

// Auditable runs for historical category enrichment. Generation never changes
// bookmark assignments; candidates must be explicitly approved by an admin.
export const categoryEnrichmentRuns = pgTable(
  "category_enrichment_runs",
  {
    id: serial("id").primaryKey(),
    model: text("model").notNull(),
    requestedBy: text("requested_by"),
    status: text("status").notNull().default("running"),
    sourceBookmarkCount: integer("source_bookmark_count").notNull().default(0),
    processedCount: integer("processed_count").notNull().default(0),
    candidateCount: integer("candidate_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("category_enrichment_runs_status_started_idx").on(
      t.status,
      t.startedAt,
    ),
    check(
      "category_enrichment_runs_status_check",
      sql`${t.status} in ('running', 'succeeded', 'failed')`,
    ),
  ],
);

// Model suggestions stay separate from the live bookmark-category join until
// editorial approval. Confidence is stored as basis points to avoid floating
// point comparisons in review filters and auto-approval policies.
export const categoryAssignmentCandidates = pgTable(
  "category_assignment_candidates",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => categoryEnrichmentRuns.id, { onDelete: "cascade" }),
    bookmarkId: integer("bookmark_id")
      .notNull()
      .references(() => bookmarks.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    rank: smallint("rank").notNull(),
    confidenceBasisPoints: smallint("confidence_basis_points").notNull(),
    rationale: text("rationale").notNull(),
    status: text("status").notNull().default("pending"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("category_candidates_run_bookmark_category_unique").on(
      t.runId,
      t.bookmarkId,
      t.categoryId,
    ),
    uniqueIndex("category_candidates_run_bookmark_rank_unique").on(
      t.runId,
      t.bookmarkId,
      t.rank,
    ),
    index("category_candidates_status_confidence_idx").on(
      t.status,
      t.confidenceBasisPoints,
      t.id,
    ),
    index("category_candidates_bookmark_idx").on(t.bookmarkId, t.status),
    check("category_candidates_rank_check", sql`${t.rank} between 1 and 2`),
    check(
      "category_candidates_confidence_check",
      sql`${t.confidenceBasisPoints} between 0 and 10000`,
    ),
    check(
      "category_candidates_status_check",
      sql`${t.status} in ('pending', 'applied', 'rejected')`,
    ),
  ],
);

// Every attempted source bookmark is recorded, including those for which the
// model correctly returns no category. This makes "next 100" resumable and
// prevents no-match bookmarks from being selected forever.
export const categoryEnrichmentRunBookmarks = pgTable(
  "category_enrichment_run_bookmarks",
  {
    runId: integer("run_id")
      .notNull()
      .references(() => categoryEnrichmentRuns.id, { onDelete: "cascade" }),
    bookmarkId: integer("bookmark_id")
      .notNull()
      .references(() => bookmarks.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    candidateCount: smallint("candidate_count").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.runId, t.bookmarkId] }),
    index("category_enrichment_sources_bookmark_idx").on(t.bookmarkId),
    check(
      "category_enrichment_sources_status_check",
      sql`${t.status} in ('pending', 'processed', 'failed')`,
    ),
    check(
      "category_enrichment_sources_candidate_count_check",
      sql`${t.candidateCount} between 0 and 2`,
    ),
  ],
);

// Tags table
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  color: text("color"),
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// Bookmark-Tags join table (many-to-many)
export const bookmarkTags = pgTable(
  "bookmark_tags",
  {
    bookmarkId: integer("bookmark_id")
      .notNull()
      .references(() => bookmarks.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.bookmarkId, t.tagId] }),
    // Reverse lookups by tag (tag pages, getTagsWithCount join) can't use the
    // bookmark_id-leading PK — index tag_id separately.
    index("bookmark_tags_tag_id_idx").on(t.tagId),
  ],
);

// Durable audit / idempotency record for AI-generated collection drafts. A
// fingerprint represents the exact public-bookmark snapshot that was clustered.
export const collectionGenerationRuns = pgTable(
  "collection_generation_runs",
  {
    id: serial("id").primaryKey(),
    inputFingerprint: text("input_fingerprint").notNull(),
    source: text("source").notNull(), // "admin" | "cron"
    requestedBy: text("requested_by"),
    status: text("status").notNull().default("running"), // running | succeeded | failed
    sourceBookmarkCount: integer("source_bookmark_count").notNull().default(0),
    generatedCount: integer("generated_count").notNull().default(0),
    createdCount: integer("created_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    attemptCount: integer("attempt_count").notNull().default(1),
    error: text("error"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("collection_generation_runs_fingerprint_unique").on(
      t.inputFingerprint,
    ),
    index("collection_generation_runs_status_started_idx").on(
      t.status,
      t.startedAt,
    ),
  ],
);

// Collections table (curated tool lists)
export const collections = pgTable(
  "collections",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    content: text("content"), // Rich text / markdown intro
    coverImage: text("cover_image"),
    status: text("status").notNull().default("draft"), // draft, published
    sortOrder: integer("sort_order").notNull().default(0),
    generationRunId: integer("generation_run_id").references(
      () => collectionGenerationRuns.id,
      { onDelete: "set null" },
    ),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("collections_published_at_idx").on(t.publishedAt)],
);

// Collection-Bookmarks join table (many-to-many, with ordering)
export const collectionBookmarks = pgTable(
  "collection_bookmarks",
  {
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    bookmarkId: integer("bookmark_id")
      .notNull()
      .references(() => bookmarks.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    note: text("note"), // Why this tool is in the collection
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.bookmarkId] })],
);

// Translations table (AI-generated content translations cache)
// Distributed rate-limit counters keyed by (action, key). Replaces per-instance
// in-memory rate limits which break under serverless cold starts.
export const rateLimits = pgTable(
  "rate_limits",
  {
    id: serial("id").primaryKey(),
    action: text("action").notNull(), // e.g. "upload"
    key: text("key").notNull(), // typically client IP
    count: integer("count").notNull().default(0),
    windowStart: timestamp("window_start").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("rate_limits_action_key_idx").on(t.action, t.key)],
);

// Public API tokens (consumed by /api/v1). Only the SHA-256 hash is stored,
// never the plaintext — like a GitHub PAT.
export const apiTokens = pgTable(
  "api_tokens",
  {
    id: serial("id").primaryKey(),
    consumer: text("consumer").notNull(), // stable identifier for an API client
    tokenHash: text("token_hash").notNull().unique(), // SHA-256(token) hex
    prefix: text("prefix").notNull(), // display only, e.g. 'hcy_live_a1b2'
    scopes: text("scopes")
      .array()
      .notNull()
      .default(sql`ARRAY['read:products']::text[]`),
    rateLimitPerMin: integer("rate_limit_per_min").notNull().default(60),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => [index("api_tokens_consumer_idx").on(t.consumer)],
);

// Outbound webhooks: consumers register a URL and receive HMAC-signed change
// batches. Each webhook tracks its own cursor over the /changes feed, so
// delivery is at-least-once and retries are just the next cron run.
export const webhooks = pgTable(
  "webhooks",
  {
    id: serial("id").primaryKey(),
    consumer: text("consumer").notNull(),
    url: text("url").notNull(),
    secret: text("secret").notNull(), // whsec_… ; signs payloads (HMAC-SHA256)
    events: text("events")
      .array()
      .notNull()
      .default(sql`ARRAY['product.upsert','product.delete']::text[]`),
    active: boolean("active").notNull().default(true),
    cursor: timestamp("cursor").notNull().defaultNow(), // last change timestamp delivered
    failureCount: integer("failure_count").notNull().default(0),
    lastDeliveryAt: timestamp("last_delivery_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => [index("webhooks_active_idx").on(t.active)],
);

// One row per webhook POST attempt, for delivery observability/debugging.
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: serial("id").primaryKey(),
    webhookId: integer("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    eventCount: integer("event_count").notNull(),
    status: text("status").notNull(), // 'success' | 'failed'
    httpStatus: integer("http_status"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("webhook_deliveries_webhook_created_idx").on(
      t.webhookId,
      t.createdAt,
    ),
    index("webhook_deliveries_created_idx").on(t.createdAt), // serves the retention prune
  ],
);

// Per-request metrics for the public API (/api/v1), powering the usage panel.
export const apiRequestLogs = pgTable(
  "api_request_logs",
  {
    id: serial("id").primaryKey(),
    consumer: text("consumer").notNull(), // token consumer, or "anonymous" for failed auth
    method: text("method").notNull(),
    path: text("path").notNull(),
    status: integer("status").notNull(),
    durationMs: integer("duration_ms").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("api_request_logs_consumer_created_idx").on(t.consumer, t.createdAt),
    index("api_request_logs_created_idx").on(t.createdAt),
  ],
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: serial("id").primaryKey(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    method: text("method").notNull(),
    path: text("path").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    status: integer("status").notNull(),
    metadata: json("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("admin_audit_actor_idx").on(t.actorEmail, t.createdAt),
    index("admin_audit_target_idx").on(t.targetType, t.targetId),
  ],
);

export const translations = pgTable(
  "translations",
  {
    id: serial("id").primaryKey(),
    entityType: text("entity_type").notNull(), // 'bookmark', 'category', 'collection', 'tag'
    entityId: integer("entity_id").notNull(),
    locale: text("locale").notNull(), // 'zh', 'ja', 'es', 'pt', 'de', 'fr'
    field: text("field").notNull(), // 'title', 'description', 'overview', etc.
    value: text("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("translations_unique_idx").on(
      t.entityType,
      t.entityId,
      t.locale,
      t.field,
    ),
  ],
);

// Relations
export const bookmarksRelations = relations(bookmarks, ({ one, many }) => ({
  category: one(categories, {
    fields: [bookmarks.categoryId],
    references: [categories.id],
  }),
  bookmarkTags: many(bookmarkTags),
  bookmarkCategories: many(bookmarkCategories),
  collectionBookmarks: many(collectionBookmarks),
  categoryAssignmentCandidates: many(categoryAssignmentCandidates),
  categoryEnrichmentRunBookmarks: many(categoryEnrichmentRunBookmarks),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  bookmarks: many(bookmarks),
  bookmarkCategories: many(bookmarkCategories),
  submissionCategories: many(submissionCategories),
  categoryAssignmentCandidates: many(categoryAssignmentCandidates),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  category: one(categories, {
    fields: [submissions.categoryId],
    references: [categories.id],
  }),
  submissionCategories: many(submissionCategories),
}));

export const bookmarkCategoriesRelations = relations(
  bookmarkCategories,
  ({ one }) => ({
    bookmark: one(bookmarks, {
      fields: [bookmarkCategories.bookmarkId],
      references: [bookmarks.id],
    }),
    category: one(categories, {
      fields: [bookmarkCategories.categoryId],
      references: [categories.id],
    }),
  }),
);

export const submissionCategoriesRelations = relations(
  submissionCategories,
  ({ one }) => ({
    submission: one(submissions, {
      fields: [submissionCategories.submissionId],
      references: [submissions.id],
    }),
    category: one(categories, {
      fields: [submissionCategories.categoryId],
      references: [categories.id],
    }),
  }),
);

export const categoryEnrichmentRunsRelations = relations(
  categoryEnrichmentRuns,
  ({ many }) => ({
    candidates: many(categoryAssignmentCandidates),
    bookmarks: many(categoryEnrichmentRunBookmarks),
  }),
);

export const categoryAssignmentCandidatesRelations = relations(
  categoryAssignmentCandidates,
  ({ one }) => ({
    run: one(categoryEnrichmentRuns, {
      fields: [categoryAssignmentCandidates.runId],
      references: [categoryEnrichmentRuns.id],
    }),
    bookmark: one(bookmarks, {
      fields: [categoryAssignmentCandidates.bookmarkId],
      references: [bookmarks.id],
    }),
    category: one(categories, {
      fields: [categoryAssignmentCandidates.categoryId],
      references: [categories.id],
    }),
  }),
);

export const categoryEnrichmentRunBookmarksRelations = relations(
  categoryEnrichmentRunBookmarks,
  ({ one }) => ({
    run: one(categoryEnrichmentRuns, {
      fields: [categoryEnrichmentRunBookmarks.runId],
      references: [categoryEnrichmentRuns.id],
    }),
    bookmark: one(bookmarks, {
      fields: [categoryEnrichmentRunBookmarks.bookmarkId],
      references: [bookmarks.id],
    }),
  }),
);

export const tagsRelations = relations(tags, ({ many }) => ({
  bookmarkTags: many(bookmarkTags),
}));

export const bookmarkTagsRelations = relations(bookmarkTags, ({ one }) => ({
  bookmark: one(bookmarks, {
    fields: [bookmarkTags.bookmarkId],
    references: [bookmarks.id],
  }),
  tag: one(tags, {
    fields: [bookmarkTags.tagId],
    references: [tags.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ many, one }) => ({
  collectionBookmarks: many(collectionBookmarks),
  generationRun: one(collectionGenerationRuns, {
    fields: [collections.generationRunId],
    references: [collectionGenerationRuns.id],
  }),
}));

export const collectionGenerationRunsRelations = relations(
  collectionGenerationRuns,
  ({ many }) => ({
    collections: many(collections),
  }),
);

export const collectionBookmarksRelations = relations(
  collectionBookmarks,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionBookmarks.collectionId],
      references: [collections.id],
    }),
    bookmark: one(bookmarks, {
      fields: [collectionBookmarks.bookmarkId],
      references: [bookmarks.id],
    }),
  }),
);

// Type definitions
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type BookmarkCategory = typeof bookmarkCategories.$inferSelect;
export type NewBookmarkCategory = typeof bookmarkCategories.$inferInsert;

export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type SubmissionCategory = typeof submissionCategories.$inferSelect;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;

export type Translation = typeof translations.$inferSelect;
export type NewTranslation = typeof translations.$inferInsert;

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;

export type ApiToken = typeof apiTokens.$inferSelect;
export type NewApiToken = typeof apiTokens.$inferInsert;

export type ApiRequestLog = typeof apiRequestLogs.$inferSelect;
export type NewApiRequestLog = typeof apiRequestLogs.$inferInsert;

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
