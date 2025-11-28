CREATE TABLE IF NOT EXISTS "bookmarks" (
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
	"notes" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"is_dofollow" boolean DEFAULT false NOT NULL,
	"search_results" text,
	CONSTRAINT "bookmarks_url_unique" UNIQUE("url"),
	CONSTRAINT "bookmarks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"color" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"full_name" text,
	"avatar_url" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"tagline" text,
	"description" text,
	"category_id" integer,
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
	CONSTRAINT "submissions_url_unique" UNIQUE("url")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
