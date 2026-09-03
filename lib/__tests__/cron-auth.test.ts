import { test, expect, afterEach } from "bun:test";
import { verifyBearerToken, verifyCronAuth } from "@/lib/cron-auth";

function req(authHeader?: string): { headers: Headers } {
  const headers = new Headers();
  if (authHeader !== undefined) headers.set("authorization", authHeader);
  return { headers };
}

test("verifyBearerToken accepts the matching token", () => {
  expect(verifyBearerToken(req("Bearer s3cret"), "s3cret")).toBe(true);
});

test("verifyBearerToken rejects a wrong token", () => {
  expect(verifyBearerToken(req("Bearer nope"), "s3cret")).toBe(false);
});

test("verifyBearerToken rejects a token of different length", () => {
  expect(verifyBearerToken(req("Bearer s3cretXXXX"), "s3cret")).toBe(false);
});

test("verifyBearerToken fails closed when expected secret is unset", () => {
  expect(verifyBearerToken(req("Bearer anything"), undefined)).toBe(false);
  expect(verifyBearerToken(req("Bearer anything"), "")).toBe(false);
});

test("verifyBearerToken rejects missing or malformed header", () => {
  expect(verifyBearerToken(req(), "s3cret")).toBe(false);
  expect(verifyBearerToken(req("s3cret"), "s3cret")).toBe(false); // no Bearer prefix
  expect(verifyBearerToken(req("Basic s3cret"), "s3cret")).toBe(false);
});

const ORIGINAL = process.env.CRON_SECRET;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL;
});

test("verifyCronAuth reads CRON_SECRET from env", () => {
  process.env.CRON_SECRET = "cron-token";
  expect(verifyCronAuth(req("Bearer cron-token"))).toBe(true);
  expect(verifyCronAuth(req("Bearer wrong"))).toBe(false);
});

test("verifyCronAuth fails closed when CRON_SECRET unset", () => {
  delete process.env.CRON_SECRET;
  expect(verifyCronAuth(req("Bearer anything"))).toBe(false);
});
