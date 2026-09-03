import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { getAllCategories } from "@/lib/data";

export const dynamic = 'force-dynamic';

// Public, non-sensitive list. CF can serve from edge while we refresh.
const CACHE_HEADERS = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

// Route through the cached helper instead of issuing a parallel db.select
// here, so admin mutations going through `invalidate(CACHE_TAGS.categories)`
// bust this list too. CDN s-maxage still caps externally-visible staleness
// at ~60s; tag invalidation removes the upstream race when an admin changes
// a category just before a CDN miss.
export async function GET() {
    try {
        const allCategories = (await getAllCategories())
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((c) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                groupKey: c.groupKey,
            }));

        return NextResponse.json({ categories: allCategories }, { headers: CACHE_HEADERS });
    } catch (error) {
        logger.error("Error fetching categories:", error);
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }
}
