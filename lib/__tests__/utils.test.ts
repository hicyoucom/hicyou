import { test, expect } from "bun:test";
import { generateSlug } from "@/lib/utils";

test("generateSlug lowercases and hyphenates", () => {
  expect(generateSlug("Hello World")).toBe("hello-world");
});

test("generateSlug collapses non-alphanumerics", () => {
  expect(generateSlug("Foo!!! @@@ Bar")).toBe("foo-bar");
});

test("generateSlug trims leading/trailing hyphens", () => {
  expect(generateSlug("  -Leading & Trailing-  ")).toBe("leading-trailing");
});

test("generateSlug drops non-ascii", () => {
  expect(generateSlug("café münchen")).toBe("caf-m-nchen");
});
