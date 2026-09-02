import { describe, expect, test } from "bun:test";
import { generateSoftwareApplicationSchema } from "@/components/json-ld";
import {
  countMeaningfulListingItems,
  getDisplayableListingItems,
  getListedDomain,
  getProductCredibility,
} from "@/lib/product-credibility";

describe("product credibility facts", () => {
  test("counts only present, displayable listing details", () => {
    expect(
      countMeaningfulListingItems([
        "Feature one",
        "  ",
        { name: "Structured feature", description: "Legacy shape" },
        { name: "\n" },
        { description: "No name" },
        42,
      ]),
    ).toBe(2);
    expect(countMeaningfulListingItems({ name: "not an array" })).toBe(0);
    expect(
      getDisplayableListingItems([
        " Feature one ",
        "  ",
        { name: " Structured feature ", description: "Legacy shape" },
        { name: "\n" },
        { description: "No name" },
        42,
      ]),
    ).toEqual(["Feature one", "Structured feature"]);
  });

  test("derives directory facts without treating them as an external certification", () => {
    const publishedAt = new Date("2026-08-01T10:00:00.000Z");
    const updatedAt = new Date("2026-08-12T10:00:00.000Z");

    expect(
      getProductCredibility({
        url: "https://www.example.com/pricing?plan=starter",
        createdAt: new Date("2026-07-31T10:00:00.000Z"),
        updatedAt,
        publishedAt,
        overview: "  A useful overview.  ",
        keyFeatures: ["Feature", { name: "Legacy feature" }],
        useCases: ["Research", "\t", null],
      }),
    ).toEqual({
      recordDate: publishedAt,
      recordDateKind: "published",
      updatedAt,
      listedDomain: "example.com",
      hasOverview: true,
      keyFeatureCount: 2,
      useCaseCount: 1,
    });
  });

  test("falls back to the record creation date and hides malformed destinations", () => {
    const createdAt = new Date("2026-08-03T10:00:00.000Z");
    const credibility = getProductCredibility({
      url: "mailto:hello@example.com",
      createdAt,
      updatedAt: new Date("invalid"),
      publishedAt: new Date("invalid"),
      overview: "\n\t",
      keyFeatures: "not an array",
      useCases: [],
    });

    expect(credibility).toEqual({
      recordDate: createdAt,
      recordDateKind: "created",
      updatedAt: null,
      listedDomain: null,
      hasOverview: false,
      keyFeatureCount: 0,
      useCaseCount: 0,
    });
    expect(getListedDomain("not a URL")).toBeNull();
  });
});

describe("SoftwareApplication JSON-LD record timestamps", () => {
  test("emits only valid HiCyou record timestamps", () => {
    const schema = generateSoftwareApplicationSchema({
      title: "Example tool",
      slug: "example-tool",
      url: "https://example.com",
      publishedAt: new Date("2026-08-01T10:00:00.000Z"),
      updatedAt: new Date("2026-08-12T10:00:00.000Z"),
    });

    expect(schema.datePublished).toBe("2026-08-01T10:00:00.000Z");
    expect(schema.dateModified).toBe("2026-08-12T10:00:00.000Z");

    const withoutValidDates = generateSoftwareApplicationSchema({
      title: "No dates",
      slug: "no-dates",
      url: "https://example.com/no-dates",
      publishedAt: new Date("invalid"),
      updatedAt: null,
    });
    expect("datePublished" in withoutValidDates).toBe(false);
    expect("dateModified" in withoutValidDates).toBe(false);
  });
});
