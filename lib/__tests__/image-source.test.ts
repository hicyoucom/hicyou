import { describe, expect, test } from "bun:test";

import { normalizePublicImageSource } from "@/lib/image-source";

describe("bookmark image source normalization", () => {
  test("accepts same-origin paths and credential-free HTTPS URLs", () => {
    expect(normalizePublicImageSource("/assets/logos/example.svg")).toBe(
      "/assets/logos/example.svg",
    );
    expect(
      normalizePublicImageSource("https://cdn.example.com/cover.png"),
    ).toBe("https://cdn.example.com/cover.png");
  });

  test("rejects protocol-relative, insecure, credentialed, and malformed URLs", () => {
    const credentialedUrl = [
      "https://user:secret",
      "cdn.example.com/cover.png",
    ].join("@");
    for (const source of [
      "//tracker.example/pixel.png",
      "/\\tracker.example/pixel.png",
      "http://cdn.example.com/cover.png",
      credentialedUrl,
      "javascript:alert(1)",
      "not a URL",
      null,
      undefined,
    ]) {
      expect(normalizePublicImageSource(source)).toBeNull();
    }
  });
});
