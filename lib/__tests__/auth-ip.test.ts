import { expect, test } from "bun:test";
import { parseTrustedAuthIpHeaders } from "@/lib/auth-ip";

test("normalizes and deduplicates explicitly trusted auth IP headers", () => {
  expect(
    parseTrustedAuthIpHeaders(
      " CF-Connecting-IP, x-real-ip, cf-connecting-ip ",
    ),
  ).toEqual(["cf-connecting-ip", "x-real-ip"]);
});

test("rejects malformed header names instead of trusting an invalid value", () => {
  expect(
    parseTrustedAuthIpHeaders("x-real-ip, invalid header, "),
  ).toEqual(["x-real-ip"]);
  expect(parseTrustedAuthIpHeaders(" , \t ")).toBeUndefined();
  expect(parseTrustedAuthIpHeaders(undefined)).toBeUndefined();
});
