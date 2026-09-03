/**
 * Calculates publication rate from submissions that have received a final
 * review outcome. Pending, verified, and legacy states are intentionally not
 * included in the denominator.
 */
export function getPublisherPublicationRate(
  publishedSubmissions: number,
  rejectedSubmissions: number,
): number | null {
  const decidedSubmissions = publishedSubmissions + rejectedSubmissions;

  return decidedSubmissions > 0
    ? publishedSubmissions / decidedSubmissions
    : null;
}
