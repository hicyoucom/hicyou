CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_email" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"ip" text,
	"user_agent" text,
	"status" integer NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_request_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"consumer" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"consumer" text NOT NULL,
	"token_hash" text NOT NULL,
	"prefix" text NOT NULL,
	"scopes" text[] DEFAULT ARRAY['read:products']::text[] NOT NULL,
	"rate_limit_per_min" integer DEFAULT 60 NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "api_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "bookmark_categories" (
	"bookmark_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookmark_categories_bookmark_id_category_id_pk" PRIMARY KEY("bookmark_id","category_id"),
	CONSTRAINT "bookmark_categories_position_check" CHECK ("bookmark_categories"."position" between 0 and 2)
);
--> statement-breakpoint
CREATE TABLE "bookmark_tags" (
	"bookmark_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "bookmark_tags_bookmark_id_tag_id_pk" PRIMARY KEY("bookmark_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"category_id" integer,
	"tags" text,
	"favicon" text,
	"screenshot" text,
	"overview" text,
	"why_startups" text,
	"alternatives" text,
	"pricing_type" text DEFAULT 'Paid' NOT NULL,
	"og_image" text,
	"og_title" text,
	"og_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_visited" timestamp,
	"status" text DEFAULT 'published' NOT NULL,
	"published_at" timestamp,
	"deleted_at" timestamp,
	"notes" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"is_dofollow" boolean DEFAULT false NOT NULL,
	"search_results" text,
	"key_features" json,
	"use_cases" json,
	"faqs" json,
	CONSTRAINT "bookmarks_url_unique" UNIQUE("url"),
	CONSTRAINT "bookmarks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"color" text,
	"icon" text,
	"group_key" text DEFAULT 'work' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "categories_group_key_check" CHECK ("categories"."group_key" in ('ai', 'build', 'work', 'growth', 'life', 'other')),
	CONSTRAINT "categories_status_check" CHECK ("categories"."status" in ('draft', 'active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "category_assignment_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"bookmark_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"rank" smallint NOT NULL,
	"confidence_basis_points" smallint NOT NULL,
	"rationale" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "category_candidates_rank_check" CHECK ("category_assignment_candidates"."rank" between 1 and 2),
	CONSTRAINT "category_candidates_confidence_check" CHECK ("category_assignment_candidates"."confidence_basis_points" between 0 and 10000),
	CONSTRAINT "category_candidates_status_check" CHECK ("category_assignment_candidates"."status" in ('pending', 'applied', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "category_enrichment_run_bookmarks" (
	"run_id" integer NOT NULL,
	"bookmark_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"candidate_count" smallint DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "category_enrichment_run_bookmarks_run_id_bookmark_id_pk" PRIMARY KEY("run_id","bookmark_id"),
	CONSTRAINT "category_enrichment_sources_status_check" CHECK ("category_enrichment_run_bookmarks"."status" in ('pending', 'processed', 'failed')),
	CONSTRAINT "category_enrichment_sources_candidate_count_check" CHECK ("category_enrichment_run_bookmarks"."candidate_count" between 0 and 2)
);
--> statement-breakpoint
CREATE TABLE "category_enrichment_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"requested_by" text,
	"status" text DEFAULT 'running' NOT NULL,
	"source_bookmark_count" integer DEFAULT 0 NOT NULL,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"candidate_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "category_enrichment_runs_status_check" CHECK ("category_enrichment_runs"."status" in ('running', 'succeeded', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "collection_bookmarks" (
	"collection_id" integer NOT NULL,
	"bookmark_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"note" text,
	CONSTRAINT "collection_bookmarks_collection_id_bookmark_id_pk" PRIMARY KEY("collection_id","bookmark_id")
);
--> statement-breakpoint
CREATE TABLE "collection_generation_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"input_fingerprint" text NOT NULL,
	"source" text NOT NULL,
	"requested_by" text,
	"status" text DEFAULT 'running' NOT NULL,
	"source_bookmark_count" integer DEFAULT 0 NOT NULL,
	"generated_count" integer DEFAULT 0 NOT NULL,
	"created_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"content" text,
	"cover_image" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"generation_run_id" integer,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"name" text,
	"full_name" text,
	"avatar_url" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "submission_categories" (
	"submission_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "submission_categories_submission_id_category_id_pk" PRIMARY KEY("submission_id","category_id"),
	CONSTRAINT "submission_categories_position_check" CHECK ("submission_categories"."position" between 0 and 2)
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"tagline" text,
	"description" text,
	"category_id" integer,
	"user_id" text,
	"why_startups" text,
	"alternatives" text,
	"pricing_type" text DEFAULT 'Paid' NOT NULL,
	"logo" text,
	"cover" text,
	"submitter_email" text,
	"submitter_name" text,
	"submitter_ip" text,
	"has_badge" boolean DEFAULT false NOT NULL,
	"badge_verified" boolean DEFAULT false NOT NULL,
	"badge_verified_at" timestamp,
	"backlink_verified" boolean DEFAULT false NOT NULL,
	"backlink_verified_at" timestamp,
	"is_dofollow" boolean DEFAULT false NOT NULL,
	"publish_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"key_features" json,
	"use_cases" json,
	"faqs" json,
	CONSTRAINT "submissions_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"locale" text NOT NULL,
	"field" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhook_id" integer NOT NULL,
	"event_count" integer NOT NULL,
	"status" text NOT NULL,
	"http_status" integer,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"consumer" text NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"events" text[] DEFAULT ARRAY['product.upsert','product.delete']::text[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"cursor" timestamp DEFAULT now() NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_delivery_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmark_categories" ADD CONSTRAINT "bookmark_categories_bookmark_id_bookmarks_id_fk" FOREIGN KEY ("bookmark_id") REFERENCES "public"."bookmarks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmark_categories" ADD CONSTRAINT "bookmark_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmark_tags" ADD CONSTRAINT "bookmark_tags_bookmark_id_bookmarks_id_fk" FOREIGN KEY ("bookmark_id") REFERENCES "public"."bookmarks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmark_tags" ADD CONSTRAINT "bookmark_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_assignment_candidates" ADD CONSTRAINT "category_assignment_candidates_run_id_category_enrichment_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."category_enrichment_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_assignment_candidates" ADD CONSTRAINT "category_assignment_candidates_bookmark_id_bookmarks_id_fk" FOREIGN KEY ("bookmark_id") REFERENCES "public"."bookmarks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_assignment_candidates" ADD CONSTRAINT "category_assignment_candidates_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_enrichment_run_bookmarks" ADD CONSTRAINT "category_enrichment_run_bookmarks_run_id_category_enrichment_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."category_enrichment_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_enrichment_run_bookmarks" ADD CONSTRAINT "category_enrichment_run_bookmarks_bookmark_id_bookmarks_id_fk" FOREIGN KEY ("bookmark_id") REFERENCES "public"."bookmarks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_bookmarks" ADD CONSTRAINT "collection_bookmarks_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_bookmarks" ADD CONSTRAINT "collection_bookmarks_bookmark_id_bookmarks_id_fk" FOREIGN KEY ("bookmark_id") REFERENCES "public"."bookmarks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_generation_run_id_collection_generation_runs_id_fk" FOREIGN KEY ("generation_run_id") REFERENCES "public"."collection_generation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_categories" ADD CONSTRAINT "submission_categories_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_categories" ADD CONSTRAINT "submission_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_actor_idx" ON "admin_audit_logs" USING btree ("actor_email","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_target_idx" ON "admin_audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "api_request_logs_consumer_created_idx" ON "api_request_logs" USING btree ("consumer","created_at");--> statement-breakpoint
CREATE INDEX "api_request_logs_created_idx" ON "api_request_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_tokens_consumer_idx" ON "api_tokens" USING btree ("consumer");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmark_categories_bookmark_position_unique" ON "bookmark_categories" USING btree ("bookmark_id","position");--> statement-breakpoint
CREATE INDEX "bookmark_categories_category_bookmark_idx" ON "bookmark_categories" USING btree ("category_id","bookmark_id");--> statement-breakpoint
CREATE INDEX "bookmark_tags_tag_id_idx" ON "bookmark_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "bookmarks_category_id_idx" ON "bookmarks" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "bookmarks_is_favorite_idx" ON "bookmarks" USING btree ("is_favorite");--> statement-breakpoint
CREATE INDEX "bookmarks_created_at_idx" ON "bookmarks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bookmarks_updated_at_idx" ON "bookmarks" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "bookmarks_deleted_at_idx" ON "bookmarks" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "bookmarks_status_idx" ON "bookmarks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookmarks_slug_pattern_idx" ON "bookmarks" USING btree ("slug" text_pattern_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "category_candidates_run_bookmark_category_unique" ON "category_assignment_candidates" USING btree ("run_id","bookmark_id","category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "category_candidates_run_bookmark_rank_unique" ON "category_assignment_candidates" USING btree ("run_id","bookmark_id","rank");--> statement-breakpoint
CREATE INDEX "category_candidates_status_confidence_idx" ON "category_assignment_candidates" USING btree ("status","confidence_basis_points","id");--> statement-breakpoint
CREATE INDEX "category_candidates_bookmark_idx" ON "category_assignment_candidates" USING btree ("bookmark_id","status");--> statement-breakpoint
CREATE INDEX "category_enrichment_sources_bookmark_idx" ON "category_enrichment_run_bookmarks" USING btree ("bookmark_id");--> statement-breakpoint
CREATE INDEX "category_enrichment_runs_status_started_idx" ON "category_enrichment_runs" USING btree ("status","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_generation_runs_fingerprint_unique" ON "collection_generation_runs" USING btree ("input_fingerprint");--> statement-breakpoint
CREATE INDEX "collection_generation_runs_status_started_idx" ON "collection_generation_runs" USING btree ("status","started_at");--> statement-breakpoint
CREATE INDEX "collections_published_at_idx" ON "collections" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_action_key_idx" ON "rate_limits" USING btree ("action","key");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_categories_submission_position_unique" ON "submission_categories" USING btree ("submission_id","position");--> statement-breakpoint
CREATE INDEX "submission_categories_category_submission_idx" ON "submission_categories" USING btree ("category_id","submission_id");--> statement-breakpoint
CREATE INDEX "submissions_category_id_idx" ON "submissions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "submissions_status_publish_idx" ON "submissions" USING btree ("status","publish_at");--> statement-breakpoint
CREATE INDEX "submissions_submitter_ip_created_idx" ON "submissions" USING btree ("submitter_ip","created_at");--> statement-breakpoint
CREATE INDEX "submissions_created_at_idx" ON "submissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "submissions_user_created_idx" ON "submissions" USING btree ("user_id","created_at","id") WHERE "submissions"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "translations_unique_idx" ON "translations" USING btree ("entity_type","entity_id","locale","field");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_webhook_created_idx" ON "webhook_deliveries" USING btree ("webhook_id","created_at");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_created_idx" ON "webhook_deliveries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhooks_active_idx" ON "webhooks" USING btree ("active");