import { describe, expect, test } from "bun:test";

import { submissionSchema } from "@/lib/submission-schema";

const validSubmission = {
  url: "example.com",
  title: "Example",
  tagline: "A concise product tagline",
  description: "A useful directory submission.",
  categoryId: "3",
  categoryIds: ["5", "3"],
  logo: "https://cdn.example.com/logo.png",
  cover: "/uploads/covers/example.avif",
  hasBadge: false,
  keyFeatures: ["Fast", { name: "Secure", description: "Safe defaults" }],
  useCases: ["Product research"],
  faqs: [{ question: "Is it free?", answer: "Yes." }],
  turnstileToken: null,
};

describe("submissionSchema", () => {
  test("normalizes supported input and supplies optional defaults", () => {
    const parsed = submissionSchema.parse(validSubmission);

    expect(parsed.categoryId).toBe(3);
    expect(parsed.categoryIds).toEqual([3, 5]);
    expect(parsed.logo).toBe("https://cdn.example.com/logo.png");
    expect(parsed.whyStartups).toBe("");
    expect(parsed.alternatives).toBe("");
  });

  test("rejects oversized fields and unknown payload keys", () => {
    expect(
      submissionSchema.safeParse({
        ...validSubmission,
        tagline: "x".repeat(121),
      }).success,
    ).toBe(false);
    expect(
      submissionSchema.safeParse({
        ...validSubmission,
        unexpected: "value",
      }).success,
    ).toBe(false);
  });

  test("rejects unsafe image URLs and malformed structured fields", () => {
    expect(
      submissionSchema.safeParse({
        ...validSubmission,
        logo: "http://cdn.example.com/logo.png",
      }).success,
    ).toBe(false);
    expect(
      submissionSchema.safeParse({
        ...validSubmission,
        faqs: [{ question: "Missing answer" }],
      }).success,
    ).toBe(false);
  });

  test("rejects more than three unique categories", () => {
    expect(
      submissionSchema.safeParse({
        ...validSubmission,
        categoryId: 1,
        categoryIds: [2, 3, 4],
      }).success,
    ).toBe(false);
  });
});
