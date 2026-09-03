import { describe, expect, test } from "bun:test";

import {
  getBookmarkLink,
  getBookmarkRel,
  getSafeExternalHref,
} from "@/lib/link-utils";

describe("external link safety", () => {
  test("accepts only absolute credential-free HTTP(S) links", () => {
    const credentialedUrl = ["https://user:password", "example.com"].join(
      "@",
    );
    expect(getSafeExternalHref("https://example.com/path?q=1")).toBe(
      "https://example.com/path?q=1",
    );
    expect(getSafeExternalHref("http://example.com")).toBe(
      "http://example.com/",
    );

    for (const value of [
      "javascript:alert(1)",
      "data:text/html,unsafe",
      "//example.com",
      "/relative",
      credentialedUrl,
      "not a URL",
    ]) {
      expect(getSafeExternalHref(value)).toBeNull();
      expect(getBookmarkLink(value)).toBe("#");
    }
  });

  test("adds one UTM source without corrupting queries or fragments", () => {
    expect(
      getBookmarkLink("https://example.com/path?a=1#details", true),
    ).toBe("https://example.com/path?a=1&utm_source=hicyou.com#details");
    expect(
      getBookmarkLink(
        "https://example.com/?utm_source=legacy&b=2",
        true,
      ),
    ).toBe("https://example.com/?utm_source=hicyou.com&b=2");
  });

  test("keeps noopener on every external link", () => {
    expect(getBookmarkRel(true)).toBe("noopener noreferrer");
    expect(getBookmarkRel(false)).toBe(
      "noopener noreferrer nofollow",
    );
  });
});
