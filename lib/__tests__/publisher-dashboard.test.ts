import { describe, expect, test } from "bun:test";
import { getPublisherPublicationRate } from "@/lib/publisher-dashboard";

describe("publisher dashboard metrics", () => {
  test("uses only final review outcomes for the publication rate", () => {
    expect(getPublisherPublicationRate(3, 1)).toBe(0.75);
  });

  test("does not imply a rate before a final review outcome exists", () => {
    expect(getPublisherPublicationRate(0, 0)).toBeNull();
  });
});
