import { test, expect } from "bun:test";
import { createHmac } from "node:crypto";
import {
  signPayload,
  generateWebhookSecret,
  isBlockedWebhookHost,
  validateWebhookUrl,
  webhookCursorAdvanceTo,
} from "@/lib/webhooks";

test("signPayload is Stripe-style t=,v1= over `${ts}.${body}`", () => {
  const secret = "whsec_abc";
  const body = '{"a":1}';
  const ts = 1700000000;
  const expected = createHmac("sha256", secret)
    .update(`${ts}.${body}`)
    .digest("hex");
  expect(signPayload(secret, body, ts)).toBe(`t=${ts},v1=${expected}`);
});

test("generateWebhookSecret format", () => {
  const s = generateWebhookSecret();
  expect(s).toMatch(/^whsec_[A-Za-z0-9_-]{32}$/);
  expect(generateWebhookSecret()).not.toBe(s);
});

test("isBlockedWebhookHost blocks internal/loopback/private/link-local/metadata", () => {
  for (const u of [
    "https://localhost/h",
    "https://127.0.0.1/h",
    "https://10.1.2.3/h",
    "https://192.168.0.1/h",
    "https://172.16.0.1/h",
    "https://172.31.255.255/h",
    "https://169.254.169.254/latest/meta-data",
    "https://100.64.0.1/h",
    "https://224.0.0.1/h",
    "https://2130706433/h",
    "https://[::1]/h",
    "https://svc.internal/h",
    "https://box.local/h",
    "not a url",
  ]) {
    expect(isBlockedWebhookHost(u)).toBe(true);
  }
});

test("isBlockedWebhookHost allows public hosts", () => {
  for (const u of [
    "https://consumer.example.com/webhook",
    "https://api.example.com/x",
    "https://172.32.0.1/h",
  ]) {
    expect(isBlockedWebhookHost(u)).toBe(false);
  }
});

test("validateWebhookUrl rejects private and mixed DNS answers", async () => {
  await expect(
    validateWebhookUrl("https://consumer.example.com/webhook", async () => [
      { address: "93.184.216.34" },
      { address: "10.0.0.8" },
    ]),
  ).rejects.toThrow("private or non-public networks");
});

test("validateWebhookUrl accepts a hostname only when every DNS answer is public", async () => {
  const destination = await validateWebhookUrl(
    "https://consumer.example.com/webhook",
    async () => [{ address: "93.184.216.34" }],
  );
  expect(destination.toString()).toBe("https://consumer.example.com/webhook");
});

test("drained webhook runs retain a one-minute replay overlap", () => {
  expect(
    webhookCursorAdvanceTo({
      runStart: new Date("2026-08-30T10:05:00.000Z"),
      drained: true,
      lastTs: "2026-08-30T10:04:50.000Z",
      currentCursor: new Date("2026-08-30T10:00:00.000Z"),
    }),
  ).toBe("2026-08-30T10:04:00.000Z");
});

test("capped webhook runs stop at the last consumed change", () => {
  expect(
    webhookCursorAdvanceTo({
      runStart: new Date("2026-08-30T10:05:00.000Z"),
      drained: false,
      lastTs: "2026-08-30T10:02:03.123Z",
      currentCursor: new Date("2026-08-30T10:00:00.000Z"),
    }),
  ).toBe("2026-08-30T10:02:03.123Z");
});
