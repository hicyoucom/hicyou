import { describe, expect, test } from "bun:test";
import {
  BOOKMARK_QUALITY_RULES,
  getBookmarkQualityCoverage,
  getBookmarkQualityIssues,
  getBookmarkQualityScore,
} from "@/lib/bookmark-quality";

const completeBookmark = {
  categoryId: 1,
  description: "A concise description",
  overview: "A useful long-form overview",
  favicon: "https://cdn.example/logo.svg",
  ogImage: "https://cdn.example/cover.png",
  keyFeatures: ["One useful feature"],
  useCases: ["A practical use case"],
};

describe("bookmark quality policy", () => {
  test("treats whitespace, missing editorial fields, and non-array legacy JSON as review issues", () => {
    expect(
      getBookmarkQualityIssues({
        ...completeBookmark,
        categoryId: null,
        description: "\u00a0\t\n ",
        overview: null,
        favicon: "",
        ogImage: null,
        keyFeatures: { name: "legacy object" },
        useCases: [],
      }),
    ).toEqual(BOOKMARK_QUALITY_RULES.map((rule) => rule.key));
  });

  test("gives a fully populated listing a complete score", () => {
    const issues = getBookmarkQualityIssues(completeBookmark);

    expect(issues).toEqual([]);
    expect(getBookmarkQualityScore(issues)).toBe(100);
  });

  test("derives field coverage without inventing a rate for an empty catalog", () => {
    expect(getBookmarkQualityCoverage(0, 0)).toBeNull();
    expect(getBookmarkQualityCoverage(2, 3)).toBeCloseTo(
      11 / (2 * BOOKMARK_QUALITY_RULES.length),
    );
  });
});
