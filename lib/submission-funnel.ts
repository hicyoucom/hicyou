export const SUBMISSION_FUNNEL_WINDOWS = [7, 30, 90] as const;

export type SubmissionFunnelWindow = (typeof SUBMISSION_FUNNEL_WINDOWS)[number];

export const DEFAULT_SUBMISSION_FUNNEL_WINDOW: SubmissionFunnelWindow = 30;

export interface SubmissionFunnelCounts {
  submitted: number;
  pending: number;
  verified: number;
  published: number;
  rejected: number;
  badgeVerified: number;
}

export type SubmissionFunnelRate = number | null;

export interface SubmissionFunnelMetrics extends SubmissionFunnelCounts {
  decided: number;
  inReview: number;
  unclassified: number;
  decisionRate: SubmissionFunnelRate;
  publishRate: SubmissionFunnelRate;
  approvalRate: SubmissionFunnelRate;
  badgeVerificationRate: SubmissionFunnelRate;
}

export function parseSubmissionFunnelWindow(
  value: string | string[] | undefined,
): SubmissionFunnelWindow {
  const raw = Array.isArray(value) ? value[0] : value;
  const days = Number(raw);

  return SUBMISSION_FUNNEL_WINDOWS.includes(days as SubmissionFunnelWindow)
    ? (days as SubmissionFunnelWindow)
    : DEFAULT_SUBMISSION_FUNNEL_WINDOW;
}

function count(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function rate(numerator: number, denominator: number): SubmissionFunnelRate {
  // A zero denominator means the rate has no defined meaning. Returning null
  // lets the UI distinguish it from a measured 0% conversion rate.
  return denominator > 0 ? numerator / denominator : null;
}

export function createSubmissionFunnelMetrics(
  counts: SubmissionFunnelCounts,
): SubmissionFunnelMetrics {
  const submitted = count(counts.submitted);
  const pending = count(counts.pending);
  const verified = count(counts.verified);
  const published = count(counts.published);
  const rejected = count(counts.rejected);
  const badgeVerified = count(counts.badgeVerified);
  const decided = published + rejected;
  const inReview = pending + verified;

  return {
    submitted,
    pending,
    verified,
    published,
    rejected,
    badgeVerified,
    decided,
    inReview,
    // Keep unexpected historical statuses visible instead of quietly folding
    // them into a funnel stage. That makes the dashboard a useful early data
    // quality signal while the status lifecycle remains free-form text.
    unclassified: Math.max(0, submitted - inReview - decided),
    decisionRate: rate(decided, submitted),
    publishRate: rate(published, submitted),
    approvalRate: rate(published, decided),
    badgeVerificationRate: rate(badgeVerified, submitted),
  };
}
