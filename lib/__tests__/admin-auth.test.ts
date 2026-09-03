import { test, expect } from "bun:test";

// isAdminEmail caches the parsed ADMIN_EMAILS list on first call, so set the
// env BEFORE importing the module and only exercise matching behavior here.
process.env.ADMIN_EMAILS = "Admin@Example.com, second@example.com ,third@example.com";

const { isAdminEmail } = await import("@/lib/admin-auth");

test("matches listed emails case-insensitively", () => {
  expect(isAdminEmail("admin@example.com")).toBe(true);
  expect(isAdminEmail("SECOND@example.com")).toBe(true);
  expect(isAdminEmail("third@example.com")).toBe(true);
});

test("rejects non-listed, empty, null, and undefined emails", () => {
  expect(isAdminEmail("intruder@example.com")).toBe(false);
  expect(isAdminEmail("")).toBe(false);
  expect(isAdminEmail(null)).toBe(false);
  expect(isAdminEmail(undefined)).toBe(false);
});

test("does not match partial or prefixed addresses", () => {
  expect(isAdminEmail("notadmin@example.com")).toBe(false);
  expect(isAdminEmail("admin@example.com.invalid")).toBe(false);
});
