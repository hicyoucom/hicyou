import { test, expect, afterEach } from "bun:test";
import { getClientIp } from "@/lib/rate-limit";

const ORIGINAL = process.env.TRUSTED_PROXIES;
const ORIGINAL_HEADERS = process.env.BETTER_AUTH_IP_ADDRESS_HEADERS;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.TRUSTED_PROXIES;
  else process.env.TRUSTED_PROXIES = ORIGINAL;
  if (ORIGINAL_HEADERS === undefined) delete process.env.BETTER_AUTH_IP_ADDRESS_HEADERS;
  else process.env.BETTER_AUTH_IP_ADDRESS_HEADERS = ORIGINAL_HEADERS;
});

function req(headers: Record<string, string>): Request {
  return new Request("https://example.com/", { headers });
}

test("cf-connecting-ip wins over everything else", () => {
  process.env.BETTER_AUTH_IP_ADDRESS_HEADERS = "cf-connecting-ip";
  const r = req({
    "cf-connecting-ip": "1.2.3.4",
    "x-real-ip": "5.6.7.8",
    "x-forwarded-for": "9.9.9.9, 10.10.10.10",
  });
  expect(getClientIp(r)).toBe("1.2.3.4");
});

test("x-real-ip is second in trust order", () => {
  process.env.BETTER_AUTH_IP_ADDRESS_HEADERS = "x-real-ip";
  const r = req({ "x-real-ip": "5.6.7.8", "x-forwarded-for": "9.9.9.9" });
  expect(getClientIp(r)).toBe("5.6.7.8");
});

test("x-forwarded-for: uses the LAST entry (leftmost is client-controlled)", () => {
  delete process.env.BETTER_AUTH_IP_ADDRESS_HEADERS;
  process.env.TRUSTED_PROXIES = "1";
  const r = req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" });
  expect(getClientIp(r)).toBe("3.3.3.3");
});

test("x-forwarded-for is ignored unless proxy trust is explicitly configured", () => {
  delete process.env.BETTER_AUTH_IP_ADDRESS_HEADERS;
  delete process.env.TRUSTED_PROXIES;
  expect(getClientIp(req({ "x-forwarded-for": "1.1.1.1" }))).toBe("unknown");
});

test("TRUSTED_PROXIES=0 ignores x-forwarded-for entirely", () => {
  delete process.env.BETTER_AUTH_IP_ADDRESS_HEADERS;
  process.env.TRUSTED_PROXIES = "0";
  const r = req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" });
  expect(getClientIp(r)).toBe("unknown");
});

test("rejects malformed IPs and falls back to unknown", () => {
  process.env.BETTER_AUTH_IP_ADDRESS_HEADERS = "cf-connecting-ip";
  expect(getClientIp(req({ "cf-connecting-ip": "999.1.1.1" }))).toBe("unknown");
  expect(getClientIp(req({ "cf-connecting-ip": "not-an-ip" }))).toBe("unknown");
  expect(getClientIp(req({}))).toBe("unknown");
});

test("accepts IPv6", () => {
  process.env.BETTER_AUTH_IP_ADDRESS_HEADERS = "cf-connecting-ip";
  expect(getClientIp(req({ "cf-connecting-ip": "2001:db8::1" }))).toBe("2001:db8::1");
});

test("ignores canonical-looking headers unless the deployment explicitly trusts them", () => {
  delete process.env.BETTER_AUTH_IP_ADDRESS_HEADERS;
  process.env.TRUSTED_PROXIES = "0";
  expect(
    getClientIp(req({ "cf-connecting-ip": "1.2.3.4", "x-real-ip": "5.6.7.8" })),
  ).toBe("unknown");
});
