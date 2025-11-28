import { db } from "@/db/client";
import { bookmarks, categories } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";

export type Bookmark = typeof bookmarks.$inferSelect;
export type Category = typeof categories.$inferSelect;

export async function getAllBookmarks(): Promise<(Bookmark & { category: Category | null })[]> {
  const results = await db
    .select()
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id));
  
  return results.map(row => ({
    ...row.bookmarks,
    category: row.categories,
  }));
}

export async function getAllCategories(): Promise<Category[]> {
  return await db.select().from(categories).orderBy(asc(categories.id));
}

export async function getBookmarkById(id: number): Promise<(Bookmark & { category: Category | null }) | null> {
  const results = await db
    .select()
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(eq(bookmarks.id, id))
    .limit(1);
  
  if (results.length === 0) {
    return null;
  }

  return {
    ...results[0].bookmarks,
    category: results[0].categories,
  };
}

export async function getBookmarkBySlug(slug: string): Promise<(Bookmark & { category: Category | null }) | null> {
  const results = await db
    .select()
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(eq(bookmarks.slug, slug))
    .limit(1);
  
  if (results.length === 0) {
    return null;
  }

  return {
    ...results[0].bookmarks,
    category: results[0].categories,
  };
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const results = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  
  if (results.length === 0) {
    return null;
  }

  return results[0];
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const results = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  
  if (results.length === 0) {
    return null;
  }

  return results[0];
}

// Get featured bookmarks (isFavorite = true)
export async function getFeaturedBookmarks(limit: number = 4): Promise<(Bookmark & { category: Category | null })[]> {
  const results = await db
    .select()
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(eq(bookmarks.isFavorite, true))
    .limit(limit);
  
  return results.map(row => ({
    ...row.bookmarks,
    category: row.categories,
  }));
}

// Get latest bookmarks ordered by creation date
export async function getLatestBookmarks(limit: number = 30): Promise<(Bookmark & { category: Category | null })[]> {
  const results = await db
    .select()
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .orderBy(desc(bookmarks.createdAt))
    .limit(limit);
  
  return results.map(row => ({
    ...row.bookmarks,
    category: row.categories,
  }));
}
