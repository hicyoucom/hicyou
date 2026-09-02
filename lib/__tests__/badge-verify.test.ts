import { describe, expect, test } from "bun:test";

import { containsLinkedBadge } from "@/lib/badge-verify";

const pageUrl = new URL("https://publisher.example/product");
const siteUrl = new URL("https://hicyou.com");

describe("badge markup verification", () => {
  test("requires the badge image to be inside an exact-site backlink", () => {
    expect(
      containsLinkedBadge(
        '<a href="https://www.hicyou.com/about"><span><img src="/badge/featured-light.svg"></span></a>',
        pageUrl,
        siteUrl,
      ),
    ).toBe(true);

    expect(
      containsLinkedBadge(
        '<img src="/badge/featured-light.svg"><a href="https://hicyou.com">Directory</a>',
        pageUrl,
        siteUrl,
      ),
    ).toBe(false);
  });

  test("rejects lookalike hosts, non-web markup, and unrelated images", () => {
    for (const html of [
      '<a href="https://hicyou.com.example"><img src="/badge/featured-light.svg"></a>',
      '<a href="https://hicyou.com"><img src="/unrelated.svg"></a>',
      '<a href="javascript:void(0)"><img src="/badge/featured-light.svg"></a>',
      '<a href="https://hicyou.com"><img></a>',
    ]) {
      expect(containsLinkedBadge(html, pageUrl, siteUrl)).toBe(false);
    }
  });
});
