import { describe, expect, test } from "bun:test";

import {
  buildTranslationTexts,
  isTranslationFieldKey,
  isTranslationComplete,
} from "@/lib/translation-fields";

describe("translation field planning", () => {
  const bookmark = {
    id: 7,
    title: "Tool",
    description: "Tagline",
    overview: "",
    whyStartups: null,
    notes: "must stay private",
    keyFeatures: ["Fast", { name: "Secure", description: "Encrypted at rest" }],
    useCases: ["Research"],
    faqs: [{ question: "Free?", answer: "Yes" }],
  };

  test("uses a whitelist and supports legacy object key features", () => {
    expect(buildTranslationTexts("bookmark", bookmark)).toEqual({
      title: "Tool",
      description: "Tagline",
      "keyFeatures.0": "Fast",
      "keyFeatures.1.name": "Secure",
      "keyFeatures.1.description": "Encrypted at rest",
      "useCases.0": "Research",
      "faqs.0.question": "Free?",
      "faqs.0.answer": "Yes",
    });
  });

  test("does not treat a title-only partial translation as complete", () => {
    expect(
      isTranslationComplete("bookmark", bookmark, new Set(["title"])),
    ).toBe(false);
    expect(
      isTranslationComplete(
        "bookmark",
        bookmark,
        new Set(Object.keys(buildTranslationTexts("bookmark", bookmark))),
      ),
    ).toBe(true);
  });

  test("accepts only entity-specific translation keys", () => {
    expect(isTranslationFieldKey("bookmark", "faqs.2.answer")).toBe(true);
    expect(isTranslationFieldKey("bookmark", "notes")).toBe(false);
    expect(isTranslationFieldKey("category", "title")).toBe(false);
  });
});
