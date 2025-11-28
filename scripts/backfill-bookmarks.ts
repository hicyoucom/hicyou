import { db } from "@/db/client";
import { bookmarks } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import { generateWebsiteContent } from "@/lib/ai-config";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    console.log("Starting backfill...");

    // Fetch all bookmarks
    const allBookmarks = await db.select().from(bookmarks);

    // Filter bookmarks that need backfill
    const bookmarksToUpdate = allBookmarks.filter((b: any) =>
        !b.keyFeatures || (Array.isArray(b.keyFeatures) && b.keyFeatures.length === 0)
    );

    console.log(`Found ${bookmarksToUpdate.length} bookmarks to update out of ${allBookmarks.length} total.`);

    // Concurrency control
    const CONCURRENCY_LIMIT = 2;
    const results = [];
    const executing = new Set();

    for (const bookmark of bookmarksToUpdate) {
        const p = processBookmark(bookmark).then(() => {
            executing.delete(p);
        });

        results.push(p);
        executing.add(p);

        if (executing.size >= CONCURRENCY_LIMIT) {
            await Promise.race(executing);
        }
    }

    await Promise.all(results);
    console.log("Backfill complete.");
}

async function processBookmark(bookmark: any) {
    console.log(`Processing ${bookmark.title} (${bookmark.url})...`);

    try {
        const content = await generateWebsiteContent({
            url: bookmark.url,
            title: bookmark.title,
            metaDescription: bookmark.description || undefined,
            searchResults: bookmark.overview || undefined,
        });

        if (!content.keyFeatures || content.keyFeatures.length === 0) {
            console.error(`Skipping ${bookmark.title}: AI returned empty features (likely failed)`);
            return;
        }

        await db
            .update(bookmarks)
            .set({
                keyFeatures: content.keyFeatures,
                useCases: content.useCases,
                faqs: content.faqs,
                overview: content.description,
                updatedAt: new Date(),
            })
            .where(eq(bookmarks.id, bookmark.id));

        console.log(`Updated ${bookmark.title}`);
    } catch (error) {
        console.error(`Failed to process ${bookmark.title}:`, error);
    }
}

main().catch(console.error);
