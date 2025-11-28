import { db } from "@/db/client";
import { bookmarks } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    const github = await db.query.bookmarks.findFirst({
        where: eq(bookmarks.title, "GitHub"),
    });

    console.log("GitHub Bookmark Data:");
    console.log(JSON.stringify(github, null, 2));
}

main().catch(console.error);
