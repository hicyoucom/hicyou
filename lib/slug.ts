import { db } from "@/db/client";
import { bookmarks } from "@/db/schema";
import { eq, or, like } from "drizzle-orm";
import { generateSlug } from "@/lib/utils";

/**
 * Escape LIKE metacharacters. generateSlug only emits [a-z0-9-], so this is
 * purely defensive (callers could pass titles straight from another source).
 */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Pure: pick an available slug for each title, given the slugs already taken
 * (DB rows + anything assigned earlier in this call, so duplicate titles in
 * the same batch get distinct slugs). Index-aligned with the input.
 *
 * Suffix order matches the historical generateUniqueSlug behavior:
 * base, base-2, base-3, … (caller handles the exhausted-range fallback).
 */
export function assignUniqueSlugs(titles: string[], taken: Set<string>): string[] {
  const used = new Set(taken);
  return titles.map((title) => {
    const base = generateSlug(title);
    let candidate = base;
    for (let i = 2; used.has(candidate) && i <= 100; i++) {
      candidate = `${base}-${i}`;
    }
    if (used.has(candidate)) {
      candidate = `${base}-${Date.now()}`;
    }
    used.add(candidate);
    return candidate;
  });
}

/**
 * Fetch every existing slug that could collide with `base` in one round trip
 * (uses the bookmarks.slug unique index), then pick locally.
 */
async function fetchTakenSlugs(bases: string[]): Promise<Set<string>> {
  if (bases.length === 0) return new Set();
  const rows = await db
    .select({ slug: bookmarks.slug })
    .from(bookmarks)
    .where(
      or(
        ...bases.map((base) =>
          or(eq(bookmarks.slug, base), like(bookmarks.slug, `${escapeLike(base)}-%`)),
        ),
      ),
    );
  return new Set(rows.map((r) => r.slug));
}

/**
 * Generate a unique slug by appending -2, -3, etc. if a conflict exists.
 */
export async function generateUniqueSlug(title: string): Promise<string> {
  const [slug] = await reserveUniqueSlugs([title]);
  return slug;
}

/**
 * Batch variant: one collision query for the whole batch, in-memory
 * assignment. Returns slugs index-aligned with `titles`.
 */
export async function reserveUniqueSlugs(titles: string[]): Promise<string[]> {
  const bases = [...new Set(titles.map(generateSlug))];
  const taken = await fetchTakenSlugs(bases);
  return assignUniqueSlugs(titles, taken);
}
