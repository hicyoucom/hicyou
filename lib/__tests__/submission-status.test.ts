import { describe, expect, test } from "bun:test";
import {
  getSubmissionStatusKind,
  parseSubmissionStatusCenterPage,
  parseSubmissionStatusFilter,
} from "@/lib/submission-status";

describe("submission status center helpers", () => {
  test("keeps legacy statuses visible without treating them as a supported filter", () => {
    expect(getSubmissionStatusKind("pending")).toBe("pending");
    expect(getSubmissionStatusKind("legacy_import")).toBe("unknown");
    expect(parseSubmissionStatusFilter("published")).toBe("published");
    expect(parseSubmissionStatusFilter("legacy_import")).toBe("all");
  });

  test("accepts only positive, bounded page values", () => {
    expect(parseSubmissionStatusCenterPage("3")).toBe(3);
    expect(parseSubmissionStatusCenterPage(["2", "9"])).toBe(2);
    expect(parseSubmissionStatusCenterPage("0")).toBe(1);
    expect(parseSubmissionStatusCenterPage("1.5")).toBe(1);
    expect(parseSubmissionStatusCenterPage("10001")).toBe(10_000);
    expect(parseSubmissionStatusCenterPage("Infinity")).toBe(1);
  });
});
