export const SUBMISSION_STATUSES = [
  "pending",
  "verified",
  "published",
  "rejected",
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];
export type SubmissionStatusKind = SubmissionStatus | "unknown";
export type SubmissionStatusFilter = "all" | SubmissionStatus;

export const SUBMISSION_STATUS_CENTER_PAGE_SIZE = 12;
export const MAX_SUBMISSION_STATUS_CENTER_PAGE = 10_000;

export function getSubmissionStatusKind(status: string): SubmissionStatusKind {
  return SUBMISSION_STATUSES.includes(status as SubmissionStatus)
    ? (status as SubmissionStatus)
    : "unknown";
}

export function parseSubmissionStatusFilter(
  value: string | string[] | undefined,
): SubmissionStatusFilter {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw && SUBMISSION_STATUSES.includes(raw as SubmissionStatus)
    ? (raw as SubmissionStatus)
    : "all";
}

export function parseSubmissionStatusCenterPage(
  value: string | string[] | undefined,
): number {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw || !/^[1-9]\d*$/.test(raw)) {
    return 1;
  }

  const page = Number(raw);
  return Number.isSafeInteger(page)
    ? Math.min(page, MAX_SUBMISSION_STATUS_CENTER_PAGE)
    : 1;
}
