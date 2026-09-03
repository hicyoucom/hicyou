import { test, expect } from "bun:test";
import { serializeProduct, domainFromUrl, parseInclude, type SerializeInput } from "../serialize";
import { encodeCursor, decodeCursor } from "../cursor";

function row(over: Partial<SerializeInput> = {}): SerializeInput {
  return {
    id: 1,
    slug: "claude-code",
    url: "https://www.claude.com/code",
    title: "Claude Code",
    description: "Agentic coding",
    overview: "Long overview",
    favicon: "https://x/f.png",
    screenshot: null,
    ogImage: null,
    pricingType: "Paid",
    isDofollow: true,
    category: { slug: "ai", name: "AI" },
    categories: [{ slug: "ai", name: "AI", primary: true }],
    tags: ["cli", "agent"],
    alternatives: "cursor, copilot ,",
    keyFeatures: ["a", "b"],
    useCases: ["x"],
    faqs: [{ question: "q", answer: "a" }],
    whyStartups: "because",
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2025-12-01T00:00:00Z"),
    updatedAt: new Date("2026-06-01T00:00:00Z"),
    deletedAt: null,
    ...over,
  };
}

test("domainFromUrl strips www and path", () => {
  expect(domainFromUrl("https://www.example.com/pricing")).toBe("example.com");
  expect(domainFromUrl("not a url")).toBeNull();
});

test("base product maps fields and lowercases pricing", () => {
  const p = serializeProduct(row());
  expect(p.name).toBe("Claude Code");
  expect(p.tagline).toBe("Agentic coding");
  expect(p.description).toBe("Long overview");
  expect(p.pricing_model).toBe("paid");
  expect(p.domain).toBe("claude.com");
  expect(p.source).toBe("hicyou");
  expect(p.categories).toEqual([
    { slug: "ai", name: "AI", primary: true },
  ]);
  expect(p.published_at).toBe("2026-01-01T00:00:00.000Z");
});

test("detail fields are gated behind include", () => {
  const base = serializeProduct(row());
  expect(base.key_features).toBeUndefined();
  expect(base.alternatives).toBeUndefined();

  const full = serializeProduct(row(), { include: parseInclude("alternatives,key_features,faqs,use_cases") });
  expect(full.alternatives).toEqual(["cursor", "copilot"]); // trimmed, empties dropped
  expect(full.key_features).toEqual(["a", "b"]);
  expect(full.faqs).toEqual([{ question: "q", answer: "a" }]);
  expect(full.use_cases).toEqual(["x"]);
  expect(full.why_startups).toBe("because");
});

test("does not leak internal fields", () => {
  const p = serializeProduct(row()) as Record<string, unknown>;
  for (const k of ["notes", "search_results", "isFavorite", "lastVisited", "is_favorite"]) {
    expect(k in p).toBe(false);
  }
});

test("i18n only present when translations supplied", () => {
  expect(serializeProduct(row()).i18n).toBeUndefined();
  const p = serializeProduct(row({ translations: { "zh-CN": { name: "克劳德" } } }));
  expect(p.i18n).toEqual({ "zh-CN": { name: "克劳德" } });
});

test("cursor round-trips and rejects garbage", () => {
  const c = { t: "2026-06-01T00:00:00.000Z", i: 42 };
  expect(decodeCursor(encodeCursor(c))).toEqual(c);
  expect(decodeCursor(null)).toBeNull();
  expect(() => decodeCursor("!!!not-base64-json")).toThrow();
});
