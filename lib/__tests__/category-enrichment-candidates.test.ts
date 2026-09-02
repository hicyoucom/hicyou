import { describe, expect, test } from "bun:test";

import {
  normalizeCategoryEnrichmentSuggestions,
  parseCategoryEnrichmentResponse,
} from "@/lib/category-enrichment-candidates";

describe("category enrichment candidate validation", () => {
  test("accepts at most two known, active, unassigned categories", () => {
    const result = normalizeCategoryEnrichmentSuggestions(
      {
        items: [
          {
            bookmarkId: 7,
            categories: [
              { slug: "project-management", confidence: 0.81, reason: "Tasks" },
              { slug: "documents-knowledge", confidence: 0.94, reason: "Wiki" },
              { slug: "security-privacy", confidence: 0.7, reason: "SSO" },
            ],
          },
        ],
      },
      {
        validBookmarkIds: [7],
        activeCategorySlugs: [
          "project-management",
          "documents-knowledge",
          "security-privacy",
        ],
        existingSlugsByBookmark: new Map(),
      },
    );

    expect(result.map((candidate) => candidate.categorySlug)).toEqual([
      "documents-knowledge",
      "project-management",
    ]);
    expect(result[0].confidenceBasisPoints).toBe(9400);
    expect(result.map((candidate) => candidate.rank)).toEqual([1, 2]);
  });

  test("rejects hallucinated bookmark ids, slugs, duplicates and existing categories", () => {
    const result = normalizeCategoryEnrichmentSuggestions(
      {
        items: [
          {
            bookmarkId: 7,
            categories: [
              { slug: "project-management", confidence: 0.9, reason: "Tasks" },
              { slug: "project-management", confidence: 0.8, reason: "Duplicate" },
              { slug: "invented", confidence: 0.99, reason: "Unknown" },
            ],
          },
          {
            bookmarkId: 99,
            categories: [
              { slug: "security-privacy", confidence: 0.9, reason: "Invalid id" },
            ],
          },
        ],
      },
      {
        validBookmarkIds: [7],
        activeCategorySlugs: ["project-management", "security-privacy"],
        existingSlugsByBookmark: new Map([
          [7, new Set(["project-management"])],
        ]),
      },
    );

    expect(result).toEqual([]);
  });

  test("does not propose more categories than the bookmark can hold", () => {
    const result = normalizeCategoryEnrichmentSuggestions(
      {
        items: [
          {
            bookmarkId: 7,
            categories: [
              { slug: "project-management", confidence: 0.8, reason: "Tasks" },
              { slug: "security-privacy", confidence: 0.95, reason: "Security" },
            ],
          },
        ],
      },
      {
        validBookmarkIds: [7],
        activeCategorySlugs: ["project-management", "security-privacy"],
        existingSlugsByBookmark: new Map([
          [7, new Set(["business", "development"])],
        ]),
      },
    );

    expect(result).toHaveLength(1);
    expect(result[0].categorySlug).toBe("security-privacy");
    expect(result[0].rank).toBe(1);
  });

  test("requires a valid JSON envelope and ignores malformed suggestions", () => {
    expect(() => parseCategoryEnrichmentResponse("not json")).toThrow();
    const parsed = parseCategoryEnrichmentResponse(
      JSON.stringify({
        items: [
          {
            bookmarkId: 1,
            categories: [
              { slug: "project-management", confidence: "0.9" },
              { slug: "security-privacy", confidence: 0.9, reason: "SSO" },
            ],
          },
        ],
      }),
    );
    const normalized = normalizeCategoryEnrichmentSuggestions(parsed, {
      validBookmarkIds: [1],
      activeCategorySlugs: ["project-management", "security-privacy"],
      existingSlugsByBookmark: new Map(),
    });

    expect(normalized).toHaveLength(1);
    expect(normalized[0].categorySlug).toBe("security-privacy");
  });
});
