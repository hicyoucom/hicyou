import { describe, expect, test } from "bun:test";
import {
  MOBILE_DISCOVERY_SEARCH_MAX_LENGTH,
  getMobileDiscoverySearchHref,
  normalizeMobileDiscoverySearch,
} from "@/lib/mobile-discovery";

describe("mobile discovery navigation", () => {
  test("normalizes whitespace and creates an encoded global-search URL", () => {
    expect(
      getMobileDiscoverySearchHref("  project   management & notes  "),
    ).toBe("/?search=project+management+%26+notes");
  });

  test("returns the canonical directory route for an empty search", () => {
    expect(getMobileDiscoverySearchHref("   ")).toBe("/");
  });

  test("bounds the client query before it becomes a URL", () => {
    expect(normalizeMobileDiscoverySearch("x".repeat(200))).toHaveLength(
      MOBILE_DISCOVERY_SEARCH_MAX_LENGTH,
    );
  });
});
