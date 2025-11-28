import { db } from "./client";
import { bookmarks, categories } from "./schema";
import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  const dataPath = path.join(process.cwd(), "db/seed-data.json");
  const seedData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  // Truncate tables to avoid conflicts
  console.log("Truncating tables...");
  await db.execute(sql`TRUNCATE TABLE bookmarks, categories RESTART IDENTITY CASCADE`);

  // Create categories
  console.log(`Importing ${seedData.categories.length} categories...`);

  for (const category of seedData.categories) {
    // Convert date strings to Date objects
    if (category.createdAt) category.createdAt = new Date(category.createdAt);
    if (category.updatedAt) category.updatedAt = new Date(category.updatedAt);

    await db.insert(categories)
      .values(category)
      .onConflictDoUpdate({
        target: categories.id,
        set: category
      });
  }

  // Update category sequence
  await db.execute(sql`SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))`);

  // Create bookmarks
  console.log(`Importing ${seedData.bookmarks.length} bookmarks...`);

  for (const bookmark of seedData.bookmarks) {
    // Convert date strings to Date objects
    if (bookmark.createdAt) bookmark.createdAt = new Date(bookmark.createdAt);
    if (bookmark.updatedAt) bookmark.updatedAt = new Date(bookmark.updatedAt);
    if (bookmark.lastVisited) bookmark.lastVisited = new Date(bookmark.lastVisited);

    // Parse JSON fields if they are strings
    if (typeof bookmark.keyFeatures === 'string') {
      try { bookmark.keyFeatures = JSON.parse(bookmark.keyFeatures); } catch (e) { }
    }
    if (typeof bookmark.useCases === 'string') {
      try { bookmark.useCases = JSON.parse(bookmark.useCases); } catch (e) { }
    }
    if (typeof bookmark.faqs === 'string') {
      try { bookmark.faqs = JSON.parse(bookmark.faqs); } catch (e) { }
    }

    await db.insert(bookmarks)
      .values(bookmark)
      .onConflictDoUpdate({
        target: bookmarks.id,
        set: bookmark
      });
  }

  // Update bookmarks sequence
  await db.execute(sql`SELECT setval('bookmarks_id_seq', (SELECT MAX(id) FROM bookmarks))`);

  console.log("✅ Seeding complete!");
}

seed().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
