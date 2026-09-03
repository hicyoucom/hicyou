import { afterEach, describe, expect, test } from "bun:test";
import {
  AUTO_COLLECTION_MAX_BOOKMARKS,
  getCollectionThemeKey,
  normalizeAutoCollectionCandidates,
  parseAutoCollectionResponse,
} from "@/lib/auto-collection-candidates";
import {
  getAutoCollectionSourceFingerprint,
  getAutoCollectionSourceLimit,
} from "@/lib/auto-collections";

const validContent =
  "## A focused collection\n\nThis editorial introduction explains the shared workflow, the intended audience, and why the selected tools belong together.";

describe("automatic collection candidate validation", () => {
  test("accepts only bounded candidates based on known public bookmark IDs", () => {
    const candidates = normalizeAutoCollectionCandidates(
      [
        {
          title: "AI Research Stack",
          description:
            "Tools for teams that research, summarize, and share AI-assisted findings.",
          content: validContent,
          bookmarkIds: [1, 1, 2, 3, 999],
          notes: {
            "1": "Collect source material.",
            "2": "Summarize findings.",
            "999": "Must not survive validation.",
          },
          coverBookmarkId: 999,
        },
        {
          title: "AI Research Stack!",
          description:
            "This duplicate theme must be rejected even when punctuation changes.",
          content: validContent,
          bookmarkIds: [1, 2, 3],
          notes: {},
          coverBookmarkId: 1,
        },
        {
          title: "Existing Remote Work Toolkit",
          description: "An existing theme must not be generated again.",
          content: validContent,
          bookmarkIds: [1, 2, 3],
          notes: {},
          coverBookmarkId: 1,
        },
        {
          title: "Too Short",
          description: "Too short content is not a reviewable draft.",
          content: "Brief",
          bookmarkIds: [1, 2, 3],
          notes: {},
          coverBookmarkId: 1,
        },
      ],
      {
        validBookmarkIds: [1, 2, 3, 4],
        existingTitles: ["Existing: Remote Work Toolkit"],
      },
    );

    expect(candidates).toEqual([
      {
        title: "AI Research Stack",
        slug: "ai-research-stack",
        description:
          "Tools for teams that research, summarize, and share AI-assisted findings.",
        content: validContent,
        bookmarkIds: [1, 2, 3],
        notes: {
          "1": "Collect source material.",
          "2": "Summarize findings.",
        },
        coverBookmarkId: 1,
      },
    ]);
  });

  test("caps a candidate to the public collection size limit", () => {
    const bookmarkIds = Array.from(
      { length: AUTO_COLLECTION_MAX_BOOKMARKS + 4 },
      (_, index) => index + 1,
    );
    const [candidate] = normalizeAutoCollectionCandidates(
      [
        {
          title: "Product Operations Toolkit",
          description:
            "A bounded collection that still contains enough useful tools for a clear topic.",
          content: validContent,
          bookmarkIds,
          notes: {},
          coverBookmarkId: bookmarkIds.at(-1),
        },
      ],
      { validBookmarkIds: bookmarkIds, existingTitles: [] },
    );

    expect(candidate?.bookmarkIds).toEqual(
      bookmarkIds.slice(0, AUTO_COLLECTION_MAX_BOOKMARKS),
    );
    expect(candidate?.coverBookmarkId).toBe(bookmarkIds[0]);
  });

  test("extracts a valid JSON array without accepting arbitrary prose as JSON", () => {
    expect(
      parseAutoCollectionResponse(
        `Here is the result:\n\n\`\`\`json\n[{"title":"Example"}]\n\`\`\``,
      ),
    ).toEqual([{ title: "Example" }]);
    expect(() => parseAutoCollectionResponse("No JSON response")).toThrow(
      "valid JSON array",
    );
  });

  test("uses stable theme keys and source fingerprints", () => {
    expect(getCollectionThemeKey("  AI—Research  Stack! ")).toBe(
      "ai research stack",
    );

    const first = [
      { id: 2, updatedAt: new Date("2026-08-20T00:00:00.000Z") },
      { id: 1, updatedAt: new Date("2026-08-19T00:00:00.000Z") },
    ];
    const second = [...first].reverse();
    expect(getAutoCollectionSourceFingerprint(first)).toBe(
      getAutoCollectionSourceFingerprint(second),
    );
    expect(
      getAutoCollectionSourceFingerprint([
        { id: 1, updatedAt: new Date("2026-08-19T00:00:00.000Z") },
        { id: 2, updatedAt: new Date("2026-08-21T00:00:00.000Z") },
      ]),
    ).not.toBe(getAutoCollectionSourceFingerprint(first));
    expect(getAutoCollectionSourceFingerprint(first, ["Published theme"])).not.toBe(
      getAutoCollectionSourceFingerprint(first, ["Another published theme"]),
    );
  });
});

const previousSourceLimit = process.env.AUTO_COLLECTIONS_SOURCE_LIMIT;

afterEach(() => {
  if (previousSourceLimit === undefined) {
    delete process.env.AUTO_COLLECTIONS_SOURCE_LIMIT;
  } else {
    process.env.AUTO_COLLECTIONS_SOURCE_LIMIT = previousSourceLimit;
  }
});

test("bounds the optional source-limit configuration", () => {
  process.env.AUTO_COLLECTIONS_SOURCE_LIMIT = "2";
  expect(getAutoCollectionSourceLimit()).toBe(250);

  process.env.AUTO_COLLECTIONS_SOURCE_LIMIT = "999";
  expect(getAutoCollectionSourceLimit()).toBe(500);

  process.env.AUTO_COLLECTIONS_SOURCE_LIMIT = "120";
  expect(getAutoCollectionSourceLimit()).toBe(120);
});
