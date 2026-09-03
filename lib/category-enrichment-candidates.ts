import { z } from "zod";

export const CATEGORY_ENRICHMENT_BATCH_SIZE = 10;
export const CATEGORY_ENRICHMENT_MAX_RUN_SIZE = 100;

// These are the 16 categories introduced by the expanded taxonomy. Keeping
// the allowlist explicit prevents the enrichment job from proposing a second
// broad legacy category and makes every model decision easy to audit.
export const ENRICHMENT_CATEGORY_SLUGS = [
  "ai-content-media",
  "hosting-cloud",
  "website-app-builders",
  "design-creative",
  "security-privacy",
  "project-management",
  "collaboration-communication",
  "documents-knowledge",
  "hr-recruiting",
  "seo-content",
  "customer-support",
  "education-learning",
  "health-fitness",
  "creator-publishing",
  "entertainment-gaming",
  "hardware-iot",
] as const;

export type EnrichmentCategorySlug =
  (typeof ENRICHMENT_CATEGORY_SLUGS)[number];

export type CategoryEnrichmentSuggestion = {
  bookmarkId: number;
  categorySlug: EnrichmentCategorySlug;
  confidenceBasisPoints: number;
  rationale: string;
  rank: number;
};

const rawSuggestionSchema = z.object({
  slug: z.string().trim(),
  confidence: z.number().finite().min(0).max(1),
  reason: z.string().trim().min(1).max(400),
});

const rawBookmarkSchema = z.object({
  bookmarkId: z.number().int().positive(),
  categories: z.array(z.unknown()).max(4).default([]),
});

const responseSchema = z.object({
  items: z.array(z.unknown()).max(CATEGORY_ENRICHMENT_BATCH_SIZE),
});

export function parseCategoryEnrichmentResponse(content: string): unknown {
  const parsedJson: unknown = JSON.parse(content.trim());
  return validateCategoryEnrichmentResponse(parsedJson);
}

export function validateCategoryEnrichmentResponse(raw: unknown): unknown {
  return responseSchema.parse(raw);
}

/**
 * Treat model output as untrusted. Only source bookmark ids, explicitly
 * allowed active slugs and bounded evidence survive normalization.
 */
export function normalizeCategoryEnrichmentSuggestions(
  raw: unknown,
  options: {
    validBookmarkIds: Iterable<number>;
    activeCategorySlugs: Iterable<string>;
    existingSlugsByBookmark: ReadonlyMap<number, ReadonlySet<string>>;
  },
): CategoryEnrichmentSuggestion[] {
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) return [];

  const validBookmarkIds = new Set(options.validBookmarkIds);
  const allowedSlugs = new Set<string>(ENRICHMENT_CATEGORY_SLUGS);
  const activeSlugs = new Set(options.activeCategorySlugs);
  const seenBookmarks = new Set<number>();
  const output: CategoryEnrichmentSuggestion[] = [];

  for (const rawItem of parsed.data.items) {
    const parsedItem = rawBookmarkSchema.safeParse(rawItem);
    if (!parsedItem.success) continue;
    const item = parsedItem.data;
    if (!validBookmarkIds.has(item.bookmarkId)) continue;
    if (seenBookmarks.has(item.bookmarkId)) continue;
    seenBookmarks.add(item.bookmarkId);

    const existing = options.existingSlugsByBookmark.get(item.bookmarkId);
    const availableSlots = Math.max(0, 3 - (existing?.size ?? 0));
    const seenSlugs = new Set<string>();
    const accepted = item.categories
      .map((candidate) => rawSuggestionSchema.safeParse(candidate))
      .filter((candidate) => candidate.success)
      .map((candidate) => candidate.data)
      .filter((candidate) => {
        if (!allowedSlugs.has(candidate.slug)) return false;
        if (!activeSlugs.has(candidate.slug)) return false;
        if (existing?.has(candidate.slug)) return false;
        if (seenSlugs.has(candidate.slug)) return false;
        seenSlugs.add(candidate.slug);
        return true;
      })
      .sort((left, right) => right.confidence - left.confidence)
      .slice(0, Math.min(2, availableSlots));

    accepted.forEach((candidate, index) => {
      output.push({
        bookmarkId: item.bookmarkId,
        categorySlug: candidate.slug as EnrichmentCategorySlug,
        confidenceBasisPoints: Math.round(candidate.confidence * 10_000),
        rationale: candidate.reason.replace(/\s+/g, " ").trim().slice(0, 400),
        rank: index + 1,
      });
    });
  }

  return output;
}
