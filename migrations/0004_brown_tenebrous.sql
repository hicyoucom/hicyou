ALTER TABLE "profiles" DROP CONSTRAINT "profiles_username_unique";--> statement-breakpoint
ALTER TABLE "profiles" RENAME COLUMN "username" TO "name";
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_username_unique";