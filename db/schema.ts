import { pgTable, serial, text, timestamp, boolean, integer, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Profiles table (extends Supabase Auth)
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(), // References auth.users.id
  email: text("email"),
  name: text("name"), // User's display name
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull().unique(),
  color: text("color"), // For UI customization
  icon: text("icon"), // For UI customization
  sortOrder: integer("sort_order").notNull().default(0), // For ordering categories
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// Bookmarks table
export const bookmarks = pgTable("bookmarks", {
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

  // User data
  notes: text("notes"), // Personal notes
  isArchived: boolean("is_archived").notNull().default(false),
  isFavorite: boolean("is_favorite").notNull().default(false),
  isDofollow: boolean("is_dofollow").notNull().default(false),
  search_results: text("search_results"),

  // AI Generated Content
  keyFeatures: json("key_features"), // Array of strings or objects
  useCases: json("use_cases"), // Array of strings
  faqs: json("faqs"), // Array of { question: string, answer: string }
});

// Submissions table
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  url: text("url").notNull().unique(),
  title: text("title").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  categoryId: integer("category_id").references(() => categories.id),

  // User association
  userId: text("user_id").references(() => profiles.id), // Link to Supabase Auth user (via profiles)

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
  keyFeatures: json("key_features"),
  useCases: json("use_cases"),
  faqs: json("faqs"),
});

// Relations
export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  category: one(categories, {
    fields: [bookmarks.categoryId],
    references: [categories.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  bookmarks: many(bookmarks),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  category: one(categories, {
    fields: [submissions.categoryId],
    references: [categories.id],
  }),
}));

// Type definitions
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
