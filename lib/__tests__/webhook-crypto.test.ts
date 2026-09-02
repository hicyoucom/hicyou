import { test, expect, beforeEach, afterEach } from "bun:test";
import { randomBytes } from "node:crypto";
import { encryptSecret, decryptSecret, isEncrypted } from "@/lib/webhook-crypto";

const prev = process.env.WEBHOOK_SECRET_KEY;
beforeEach(() => {
  process.env.WEBHOOK_SECRET_KEY = randomBytes(32).toString("base64");
});
afterEach(() => {
  if (prev === undefined) delete process.env.WEBHOOK_SECRET_KEY;
  else process.env.WEBHOOK_SECRET_KEY = prev;
});

test("encrypt → decrypt round-trips and ciphertext is tagged + not plaintext", () => {
  const secret = "whsec_super_secret_value_123";
  const enc = encryptSecret(secret);
  expect(enc).not.toBe(secret);
  expect(isEncrypted(enc)).toBe(true);
  expect(enc.startsWith("enc:v1:")).toBe(true);
  expect(decryptSecret(enc)).toBe(secret);
});

test("ciphertext differs each time (random IV) but decrypts equal", () => {
  const a = encryptSecret("x");
  const b = encryptSecret("x");
  expect(a).not.toBe(b);
  expect(decryptSecret(a)).toBe("x");
  expect(decryptSecret(b)).toBe("x");
});

test("legacy plaintext (no prefix) passes through decrypt", () => {
  expect(isEncrypted("whsec_plain")).toBe(false);
  expect(decryptSecret("whsec_plain")).toBe("whsec_plain");
});

test("no key → plaintext fallback (no encryption)", () => {
  delete process.env.WEBHOOK_SECRET_KEY;
  const nodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  const enc = encryptSecret("whsec_x");
  expect(enc).toBe("whsec_x");
  expect(isEncrypted(enc)).toBe(false);
  process.env.NODE_ENV = nodeEnv;
});

test("production without a key fails closed", () => {
  delete process.env.WEBHOOK_SECRET_KEY;
  const nodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  expect(() => encryptSecret("whsec_x")).toThrow(/required in production/);
  process.env.NODE_ENV = nodeEnv;
});

test("hex key is accepted", () => {
  process.env.WEBHOOK_SECRET_KEY = randomBytes(32).toString("hex");
  const enc = encryptSecret("whsec_hexkey");
  expect(isEncrypted(enc)).toBe(true);
  expect(decryptSecret(enc)).toBe("whsec_hexkey");
});

test("set-but-invalid key fails closed (does NOT store plaintext)", () => {
  process.env.WEBHOOK_SECRET_KEY = "too-short";
  expect(() => encryptSecret("whsec_x")).toThrow();
  // also fails closed on decrypt, even for a legacy plaintext value
  expect(() => decryptSecret("whsec_legacy_plain")).toThrow();
});

test("malformed ciphertext throws (not low-level crypto error)", () => {
  const enc = encryptSecret("whsec_ok"); // valid key from beforeEach
  expect(() => decryptSecret("enc:v1:onlytwo")).toThrow(/Malformed/);
  expect(() => decryptSecret("enc:v1:" + "AAAA:BBBB:CCCC")).toThrow(/Malformed|iv\/tag/);
  expect(decryptSecret(enc)).toBe("whsec_ok"); // sanity: valid still works
});
