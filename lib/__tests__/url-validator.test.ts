import { describe, expect, test } from "bun:test";
import {
  isBlockedIp,
  normalizeHttpUrl,
  parseHttpUrl,
  resolveUrlForFetch,
  UrlValidationError,
  validateUrlForFetch,
} from "@/lib/url-validator";

describe("submission URL validation", () => {
  test("normalizes bare hostnames, fragments, query ordering, and root slashes", () => {
    expect(normalizeHttpUrl(" Example.COM/?b=2&a=1#details ")).toBe(
      "https://example.com/?a=1&b=2",
    );
    expect(normalizeHttpUrl("example.com")).toBe("https://example.com");
    expect(normalizeHttpUrl("https://example.com:443/")).toBe(
      "https://example.com",
    );
  });

  test("rejects non-web URLs and embedded credentials", () => {
    const credentialedUrl = ["https://user:password", "example.com"].join("@");
    for (const value of [
      "javascript:alert(1)",
      "ftp://example.com/file",
      "mailto:hello@example.com",
      credentialedUrl,
      "",
    ]) {
      expect(() => parseHttpUrl(value)).toThrow(UrlValidationError);
    }
  });

  test("classifies private, reserved, and public IPs conservatively", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.1",
      "100.64.0.1",
      "169.254.169.254",
      "172.16.0.1",
      "192.168.1.1",
      "192.0.2.1",
      "192.88.99.1",
      "198.18.0.1",
      "198.51.100.1",
      "203.0.113.1",
      "::1",
      "fc00::1",
      "fe80::1",
      "2001:db8::1",
      "2001:0000::1",
      "2001::1",
      "2001:2::1",
      "2002:c000:0204::1",
      "3fff::1",
      "::ffff:127.0.0.1",
    ]) {
      expect(isBlockedIp(ip)).toBe(true);
    }

    expect(isBlockedIp("8.8.8.8")).toBe(false);
    expect(isBlockedIp("2606:4700:4700::1111")).toBe(false);
  });

  test("requires every DNS answer to be public and fails closed on resolution errors", async () => {
    const resolved = await validateUrlForFetch(
      "https://example.com/path?b=2&a=1#section",
      async () => [{ address: "93.184.216.34" }],
    );
    expect(resolved.toString()).toBe("https://example.com/path?a=1&b=2");

    await expect(
      validateUrlForFetch("https://mixed.example", async () => [
        { address: "93.184.216.34" },
        { address: "127.0.0.1" },
      ]),
    ).rejects.toThrow(UrlValidationError);

    await expect(
      validateUrlForFetch("https://unresolved.example", async () => {
        throw new Error("DNS unavailable");
      }),
    ).rejects.toThrow(UrlValidationError);

    await expect(
      validateUrlForFetch("https://example.com:8443", async () => {
        throw new Error("non-default ports must be rejected before DNS");
      }),
    ).rejects.toThrow(UrlValidationError);
  });

  test("returns the exact public addresses that the HTTP transport must pin", async () => {
    const target = await resolveUrlForFetch(
      "https://rebind.example/path",
      async () => [
        { address: "93.184.216.34", family: 4 },
        { address: "2606:4700:4700::1111", family: 6 },
      ],
    );

    expect(target.url.toString()).toBe("https://rebind.example/path");
    expect(target.addresses).toEqual([
      { address: "93.184.216.34", family: 4 },
      { address: "2606:4700:4700::1111", family: 6 },
    ]);
  });

  test("rejects encoded and literal loopback URLs before any DNS lookup", async () => {
    for (const value of [
      "http://127.0.0.1",
      "http://2130706433",
      "http://[::1]",
    ]) {
      await expect(
        validateUrlForFetch(value, async () => {
          throw new Error("literal IPs must not resolve");
        }),
      ).rejects.toThrow(UrlValidationError);
    }
  });
});
