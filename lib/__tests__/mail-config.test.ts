import { afterEach, describe, expect, test } from "bun:test";

import { escapeEmailHtml, getMailFrom } from "@/lib/mail-config";

const originalMailFrom = process.env.MAIL_FROM;
const originalPublicMail = process.env.NEXT_PUBLIC_MAIL;

afterEach(() => {
  if (originalMailFrom === undefined) {
    delete process.env.MAIL_FROM;
  } else {
    process.env.MAIL_FROM = originalMailFrom;
  }

  if (originalPublicMail === undefined) {
    delete process.env.NEXT_PUBLIC_MAIL;
  } else {
    process.env.NEXT_PUBLIC_MAIL = originalPublicMail;
  }
});

describe("mail configuration", () => {
  test("prefers an explicit sender identity", () => {
    process.env.MAIL_FROM = "Directory Team <mail@example.com>";
    process.env.NEXT_PUBLIC_MAIL = "contact@example.com";

    expect(getMailFrom()).toBe("Directory Team <mail@example.com>");
  });

  test("falls back to the configured public address without an operational literal", () => {
    delete process.env.MAIL_FROM;
    process.env.NEXT_PUBLIC_MAIL = "contact@example.com";

    expect(getMailFrom()).toBe("HiCyou Team <contact@example.com>");
  });

  test("uses an RFC-reserved address when no sender is configured", () => {
    delete process.env.MAIL_FROM;
    delete process.env.NEXT_PUBLIC_MAIL;

    expect(getMailFrom()).toBe("HiCyou Team <noreply@example.com>");
  });

  test("escapes magic-link values before HTML interpolation", () => {
    expect(escapeEmailHtml('https://example.com/?next=<script>&q="test"')).toBe(
      "https://example.com/?next=&lt;script&gt;&amp;q=&quot;test&quot;",
    );
  });
});
