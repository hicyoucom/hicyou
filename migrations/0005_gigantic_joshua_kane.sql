ALTER TABLE "bookmarks" ADD COLUMN "key_features" json;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "use_cases" json;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "faqs" json;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "key_features" json;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "use_cases" json;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "faqs" json;