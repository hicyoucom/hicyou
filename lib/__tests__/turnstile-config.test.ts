import { expect, test } from "bun:test";
import { isTurnstileRequired } from "@/lib/turnstile";

test("Turnstile is required by default in production configuration", () => {
  expect(isTurnstileRequired(undefined)).toBe(true);
  expect(isTurnstileRequired("true")).toBe(true);
});

test("Turnstile accepts only explicit disabled values as an opt-out", () => {
  for (const value of ["0", "false", "FALSE", "off", "no"]) {
    expect(isTurnstileRequired(value)).toBe(false);
  }
});
