import { describe, expect, test } from "bun:test";

import { formatLogEntry } from "@/lib/logger";

describe("structured logger", () => {
  test("emits a single JSON line and serializes errors", () => {
    const error = Object.assign(new Error("request failed"), {
      code: "schema_validation",
      retryable: false,
    });
    const line = formatLogEntry(
      "error",
      ["Content enrichment failed", { productId: "123", error }],
      new Date("2026-08-31T00:00:00.000Z"),
    );

    expect(line).not.toContain("\n");
    expect(JSON.parse(line)).toMatchObject({
      timestamp: "2026-08-31T00:00:00.000Z",
      level: "error",
      message: "Content enrichment failed",
      context: {
        productId: "123",
        error: {
          name: "Error",
          message: "request failed",
          code: "schema_validation",
          retryable: false,
        },
      },
    });
  });

  test("redacts credentials and handles circular objects", () => {
    const credentialedUrl = [
      "https://user:password",
      "example.com/path?token=secret",
    ].join("@");
    const context: Record<string, unknown> = {
      apiKey: "do-not-log",
      header: "Bearer secret-value",
      url: credentialedUrl,
    };
    context.self = context;

    const parsed = JSON.parse(formatLogEntry("warn", ["redaction", context]));

    expect(parsed.context.apiKey).toBe("[redacted]");
    expect(parsed.context.header).toBe("Bearer [redacted]");
    expect(parsed.context.url).toBe(
      "https://[redacted]@example.com/path?token=[redacted]",
    );
    expect(parsed.context.self).toBe("[circular]");
  });

  test("never throws when context cannot be inspected", () => {
    const hostileContext = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("blocked");
        },
      },
    );

    expect(() =>
      formatLogEntry("error", ["serialization", hostileContext]),
    ).not.toThrow();
    expect(
      JSON.parse(formatLogEntry("error", ["serialization", hostileContext]))
        .context,
    ).toBe("[unserializable]");
    expect(
      JSON.parse(formatLogEntry("info", ["timestamp"], new Date("invalid")))
        .timestamp,
    ).toBe("invalid");
  });
});
