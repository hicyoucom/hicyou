import { describe, expect, test } from "bun:test";
import {
  DEFAULT_SUBMISSION_FUNNEL_WINDOW,
  createSubmissionFunnelMetrics,
  parseSubmissionFunnelWindow,
} from "@/lib/submission-funnel";

describe("submission funnel metrics", () => {
  test("accepts only the explicitly supported reporting windows", () => {
    expect(parseSubmissionFunnelWindow("7")).toBe(7);
    expect(parseSubmissionFunnelWindow(["90", "7"])).toBe(90);
    expect(parseSubmissionFunnelWindow("31")).toBe(DEFAULT_SUBMISSION_FUNNEL_WINDOW);
    expect(parseSubmissionFunnelWindow("not-a-number")).toBe(DEFAULT_SUBMISSION_FUNNEL_WINDOW);
  });

  test("derives lifecycle rates and marks zero-denominator rates unavailable", () => {
    expect(
      createSubmissionFunnelMetrics({
        submitted: 10,
        pending: 2,
        verified: 1,
        published: 4,
        rejected: 2,
        badgeVerified: 3,
      }),
    ).toEqual({
      submitted: 10,
      pending: 2,
      verified: 1,
      published: 4,
      rejected: 2,
      badgeVerified: 3,
      decided: 6,
      inReview: 3,
      unclassified: 1,
      decisionRate: 0.6,
      publishRate: 0.4,
      approvalRate: 4 / 6,
      badgeVerificationRate: 0.3,
    });

    expect(
      createSubmissionFunnelMetrics({
        submitted: 0,
        pending: 0,
        verified: 0,
        published: 0,
        rejected: 0,
        badgeVerified: 0,
      }),
    ).toMatchObject({
      decisionRate: null,
      publishRate: null,
      approvalRate: null,
      badgeVerificationRate: null,
    });

    expect(
      createSubmissionFunnelMetrics({
        submitted: 4,
        pending: 2,
        verified: 2,
        published: 0,
        rejected: 0,
        badgeVerified: 0,
      }),
    ).toMatchObject({
      decisionRate: 0,
      publishRate: 0,
      approvalRate: null,
      badgeVerificationRate: 0,
    });
  });
});
