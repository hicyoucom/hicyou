import { generateSlug } from "@/lib/utils";
import { z } from "zod";

export const AUTO_COLLECTION_MIN_BOOKMARKS = 3;
export const AUTO_COLLECTION_MAX_BOOKMARKS = 15;
export const AUTO_COLLECTION_MAX_PER_RUN = 6;
export const AUTO_COLLECTION_MAX_EXISTING_THEMES = 60;

export type AutoCollectionSourceBookmark = {
  id: number;
  title: string;
  description: string | null;
  tags: string | null;
  categoryName: string | null;
  keyFeatures: unknown;
  useCases: unknown;
  pricingType: string;
};

export type ExistingAutoCollection = {
  title: string;
};

export type AutoCollectionCandidate = {
  title: string;
  slug: string;
  description: string;
  content: string;
  bookmarkIds: number[];
  notes: Record<string, string>;
  coverBookmarkId: number;
};

const rawCandidateSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(12).max(500),
  content: z.string().trim().min(80).max(7000),
  bookmarkIds: z.array(z.number().int()).min(AUTO_COLLECTION_MIN_BOOKMARKS),
  notes: z.record(z.string().trim().max(400)).optional().default({}),
  coverBookmarkId: z.number().int().optional(),
});

/**
 * A compact comparison key used only to reject near-identical collection
 * themes before they are persisted. The public title itself is never changed.
 */
export function getCollectionThemeKey(title: string): string {
  return title
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Model output is untrusted, even though it originates from a configured
 * provider. Keep only bounded text and IDs that came from this exact public
 * source snapshot; discard malformed or duplicate themes rather than trying
 * to repair a guess.
 */
export function normalizeAutoCollectionCandidates(
  raw: unknown,
  options: {
    validBookmarkIds: Iterable<number>;
    existingTitles: Iterable<string>;
  },
): AutoCollectionCandidate[] {
  if (!Array.isArray(raw)) return [];

  const validBookmarkIds = new Set(options.validBookmarkIds);
  const occupiedThemes = new Set(
    Array.from(options.existingTitles, getCollectionThemeKey).filter(Boolean),
  );
  const candidates: AutoCollectionCandidate[] = [];

  for (const item of raw) {
    if (candidates.length >= AUTO_COLLECTION_MAX_PER_RUN) break;

    const parsed = rawCandidateSchema.safeParse(item);
    if (!parsed.success) continue;

    const bookmarkIds = Array.from(new Set(parsed.data.bookmarkIds))
      .filter((id) => validBookmarkIds.has(id))
      .slice(0, AUTO_COLLECTION_MAX_BOOKMARKS);
    if (bookmarkIds.length < AUTO_COLLECTION_MIN_BOOKMARKS) continue;

    const themeKey = getCollectionThemeKey(parsed.data.title);
    const slug = generateSlug(parsed.data.title);
    if (!themeKey || !slug || occupiedThemes.has(themeKey)) continue;

    const notes: Record<string, string> = {};
    for (const bookmarkId of bookmarkIds) {
      const note = parsed.data.notes[String(bookmarkId)];
      if (note) notes[String(bookmarkId)] = note;
    }

    const coverBookmarkId = bookmarkIds.includes(
      parsed.data.coverBookmarkId ?? -1,
    )
      ? parsed.data.coverBookmarkId!
      : bookmarkIds[0];

    candidates.push({
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      content: parsed.data.content,
      bookmarkIds,
      notes,
      coverBookmarkId,
    });
    occupiedThemes.add(themeKey);
  }

  return candidates;
}

function parseJsonArray(value: string): unknown[] | null {
  try {
    const parsed = JSON.parse(value.trim());
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function findClosingArray(value: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const character = value[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "[") {
      depth += 1;
    } else if (character === "]") {
      depth -= 1;
      if (depth === 0) return value.slice(start, index + 1);
    }
  }

  return null;
}

/**
 * Extracts one JSON array without using a greedy regex. Providers sometimes
 * wrap JSON in prose or a fenced block, so scan balanced array candidates and
 * accept only one that `JSON.parse` verifies.
 */
export function parseAutoCollectionResponse(content: string): unknown[] {
  const direct = parseJsonArray(content);
  if (direct) return direct;

  for (
    let index = content.indexOf("[");
    index >= 0;
    index = content.indexOf("[", index + 1)
  ) {
    const candidate = findClosingArray(content, index);
    if (!candidate) continue;
    const parsed = parseJsonArray(candidate);
    if (parsed) return parsed;
  }

  throw new Error("AI response did not contain a valid JSON array");
}
