import { describe, expect, test } from "bun:test";
import {
  normalizeSearchTerm,
  searchPattern,
  MAX_SEARCH_LENGTH,
} from "@/lib/search";

describe("public search input", () => {
  test("normalizes boundary whitespace without changing substring semantics", () => {
    expect(normalizeSearchTerm("  中文  ")).toBe("中文");
    expect(normalizeSearchTerm("a")).toBe("a");
    expect(normalizeSearchTerm(" ")).toBe("");
    expect(normalizeSearchTerm("a".repeat(MAX_SEARCH_LENGTH + 1))).toBe("");
  });
  test("percent, underscore and escape characters remain literal", () => {
    expect(searchPattern("100%_\\")).toBe("%100\\%\\_\\\\%");
  });
});
