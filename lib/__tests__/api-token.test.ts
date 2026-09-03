import { test, expect } from "bun:test";
import { generateApiToken, hashToken, TOKEN_PREFIX } from "@/lib/api-token";

test("generateApiToken produces hcy_live_ + 32 url-safe chars", () => {
  const { token, prefix, tokenHash } = generateApiToken();
  expect(token.startsWith(TOKEN_PREFIX)).toBe(true);
  const body = token.slice(TOKEN_PREFIX.length);
  expect(body).toMatch(/^[A-Za-z0-9_-]{32}$/);
  expect(prefix).toBe(token.slice(0, 16));
  expect(tokenHash).toBe(hashToken(token));
  expect(tokenHash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
});

test("matches the public-API auth regex", () => {
  const { token } = generateApiToken();
  expect(/^hcy_live_[A-Za-z0-9_-]{32}$/.test(token)).toBe(true);
});

test("tokens are unique and hashing is deterministic", () => {
  const a = generateApiToken();
  const b = generateApiToken();
  expect(a.token).not.toBe(b.token);
  expect(hashToken(a.token)).toBe(hashToken(a.token));
  expect(hashToken(a.token)).not.toBe(hashToken(b.token));
});
