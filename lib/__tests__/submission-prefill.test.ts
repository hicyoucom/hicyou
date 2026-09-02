import { describe, expect, test } from "bun:test";
import {
  createSubmissionPrefill,
  MAX_SUBMISSION_DESCRIPTION_LENGTH,
  MAX_SUBMISSION_TAGLINE_LENGTH,
  MAX_SUBMISSION_TITLE_LENGTH,
  shouldReplacePrefilledValue,
} from "@/lib/submission-prefill";

describe("submission metadata prefill", () => {
  test("compacts and bounds untrusted metadata before it reaches the form", () => {
    const prefill = createSubmissionPrefill({
      url: "https://example.com",
      favicon: "https://example.com/favicon.ico",
      ogImage: "https://example.com/cover.png",
      title: `  ${"T".repeat(MAX_SUBMISSION_TITLE_LENGTH + 20)}  `,
      description: `\n${"D".repeat(MAX_SUBMISSION_DESCRIPTION_LENGTH + 20)}\t`,
      metadataSource: "fetched",
    });

    expect(prefill.title).toHaveLength(MAX_SUBMISSION_TITLE_LENGTH);
    expect(prefill.description).toHaveLength(MAX_SUBMISSION_DESCRIPTION_LENGTH);
    expect(prefill.tagline).toHaveLength(MAX_SUBMISSION_TAGLINE_LENGTH);
    expect(prefill.title).not.toMatch(/^\s|\s$/);
    expect(prefill.description).not.toMatch(/^\s|\s$/);
  });

  test("uses the hostname only when the source does not provide a title", () => {
    expect(
      createSubmissionPrefill({
        url: "https://products.example.com/path",
        favicon: "",
        ogImage: "",
        title: " \n ",
        description: "  A useful product  ",
        metadataSource: "fetched",
      }),
    ).toMatchObject({
      title: "products.example.com",
      tagline: "A useful product",
      description: "A useful product",
    });
  });

  test("does not overwrite a value the user has changed", () => {
    expect(shouldReplacePrefilledValue("", "Previous title")).toBe(true);
    expect(
      shouldReplacePrefilledValue("Previous title", "Previous title"),
    ).toBe(true);
    expect(
      shouldReplacePrefilledValue("My edited title", "Previous title"),
    ).toBe(false);
    expect(shouldReplacePrefilledValue("My edited title", undefined)).toBe(
      false,
    );
  });
});
