import { test, expect } from "bun:test";
import { assignUniqueSlugs } from "@/lib/slug";

// generateSlug lowercases, strips non-alphanumerics, dashes spaces.
// assignUniqueSlugs(titles, taken) must stay index-aligned and handle
// duplicates within the same batch.

test("no conflicts → base slugs", () => {
  expect(assignUniqueSlugs(["Hello World", "Another Tool"], new Set())).toEqual([
    "hello-world",
    "another-tool",
  ]);
});

test("base slug taken → numeric suffix", () => {
  expect(assignUniqueSlugs(["Hello World"], new Set(["hello-world"]))).toEqual([
    "hello-world-2",
  ]);
});

test("finds the first free suffix", () => {
  const taken = new Set(["hello-world", "hello-world-2", "hello-world-3"]);
  expect(assignUniqueSlugs(["Hello World"], taken)).toEqual(["hello-world-4"]);
});

test("duplicate titles in one batch get distinct slugs", () => {
  const slugs = assignUniqueSlugs(["Same Title", "Same Title", "Same Title"], new Set());
  expect(new Set(slugs).size).toBe(3);
  expect(slugs[0]).toBe("same-title");
  expect(slugs[1]).toBe("same-title-2");
  expect(slugs[2]).toBe("same-title-3");
});

test("batch duplicates compose with existing DB conflicts", () => {
  const taken = new Set(["same-title", "same-title-2"]);
  const slugs = assignUniqueSlugs(["Same Title", "Same Title"], taken);
  expect(slugs).toEqual(["same-title-3", "same-title-4"]);
});

test("suffix range exhaustion falls back to a timestamp suffix", () => {
  const taken = new Set<string>(["packed-title"]);
  for (let i = 2; i <= 100; i++) taken.add(`packed-title-${i}`);
  const [slug] = assignUniqueSlugs(["Packed Title"], taken);
  expect(slug).toMatch(/^packed-title-\d{10,}$/);
});
