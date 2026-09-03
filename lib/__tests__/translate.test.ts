import { describe, expect, test } from "bun:test";

import {
  normalizeTranslationResponse,
  translateTexts,
} from "@/lib/translate";

describe("translation response validation", () => {
  test("keeps only requested fields and repairs bracketed keys", () => {
    expect(
      normalizeTranslationResponse(
        { "[title]": "标题", description: "描述", extra: "忽略" },
        ["title", "description"],
      ),
    ).toEqual({ title: "标题", description: "描述" });
  });

  test("rejects an incomplete model response", () => {
    expect(() =>
      normalizeTranslationResponse({ title: "标题" }, ["title", "description"]),
    ).toThrow("missing field: description");
  });

  test("rejects a present but empty translated field", () => {
    expect(() =>
      normalizeTranslationResponse({ title: "   " }, ["title"]),
    ).toThrow("empty field: title");
  });

  test("rejects array payloads and oversized field names before an API call", async () => {
    await expect(translateTexts([] as never, "fr")).rejects.toThrow(
      "Missing texts",
    );
    await expect(
      translateTexts({ ["x".repeat(201)]: "value" }, "fr"),
    ).rejects.toThrow("Field names must be at most 200 chars");
  });
});
