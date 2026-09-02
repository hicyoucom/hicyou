import { db } from "@/db/client";
import {
  DEFAULT_SUBMISSION_FUNNEL_WINDOW,
  createSubmissionFunnelMetrics,
  type SubmissionFunnelMetrics,
  type SubmissionFunnelWindow,
} from "@/lib/submission-funnel";
import { submissions } from "@/db/schema";
import { and, gte, lte, sql } from "drizzle-orm";

export interface SubmissionFunnel extends SubmissionFunnelMetrics {
  days: SubmissionFunnelWindow;
  since: Date;
}

/**
 * Returns the current lifecycle state of submissions created in a date cohort.
 *
 * The system does not yet persist form-view or form-start events, nor separate
 * status-change timestamps. The result intentionally reports the current state
 * of each submitted cohort rather than implying an event-by-event acquisition
 * funnel that the database cannot support.
 */
export async function getSubmissionFunnel(
  days: SubmissionFunnelWindow = DEFAULT_SUBMISSION_FUNNEL_WINDOW,
  now = new Date(),
): Promise<SubmissionFunnel> {
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  // Bind both sides of the cohort through the column timestamp encoder rather
  // than interpolating Dates into raw SQL. The upper bound makes the report an
  // actual as-of snapshot: a future-dated import cannot inflate "last N days".
  const [row] = await db
    .select({
      submitted: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) FILTER (WHERE ${submissions.status} = 'pending')::int`,
      verified: sql<number>`count(*) FILTER (WHERE ${submissions.status} = 'verified')::int`,
      published: sql<number>`count(*) FILTER (WHERE ${submissions.status} = 'published')::int`,
      rejected: sql<number>`count(*) FILTER (WHERE ${submissions.status} = 'rejected')::int`,
      badgeVerified: sql<number>`count(*) FILTER (WHERE ${submissions.badgeVerified})::int`,
    })
    .from(submissions)
    .where(
      and(gte(submissions.createdAt, since), lte(submissions.createdAt, now)),
    );

  const counts = row ?? {
    submitted: 0,
    pending: 0,
    verified: 0,
    published: 0,
    rejected: 0,
    badgeVerified: 0,
  };

  return {
    days,
    since,
    ...createSubmissionFunnelMetrics({
      submitted: Number(counts.submitted),
      pending: Number(counts.pending),
      verified: Number(counts.verified),
      published: Number(counts.published),
      rejected: Number(counts.rejected),
      badgeVerified: Number(counts.badgeVerified),
    }),
  };
}
