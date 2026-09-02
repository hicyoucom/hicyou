import {
  and,
  count,
  desc,
  eq,
  gte,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db/client";
import { bookmarks, submissions } from "@/db/schema";
import { getPublisherPublicationRate } from "@/lib/publisher-dashboard";
import { publicBookmarkCondition } from "@/lib/public-bookmark";

export const PUBLISHER_DASHBOARD_ACTIVITY_DAYS = 30;
export const PUBLISHER_DASHBOARD_LIVE_LISTINGS_LIMIT = 6;

export type PublisherDashboardSummary = {
  totalSubmissions: number;
  inReview: number;
  publishedSubmissions: number;
  rejectedSubmissions: number;
  badgeVerifiedSubmissions: number;
  badgeVerificationNeeded: number;
  submissionsLast30Days: number;
  liveListings: number;
  dofollowListings: number;
  decidedSubmissions: number;
  publicationRate: number | null;
};

export type PublisherLiveListing = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  publishedAt: Date | null;
};

export type PublisherDashboard = {
  summary: PublisherDashboardSummary;
  liveListings: PublisherLiveListing[];
};

function countWhen(condition: SQL<boolean>): SQL<number> {
  return sql<number>`count(*) FILTER (WHERE ${condition})::int`;
}

/**
 * Returns a submitter-scoped overview of the data HiCyou actually records.
 *
 * A directory entry is considered live only when both the owned submission
 * and its public bookmark are published, non-archived, and non-deleted. This
 * intentionally does not claim to measure off-platform traffic, clicks, or
 * conversions because HiCyou does not collect them.
 */
export async function getPublisherDashboard(
  userId: string,
  now = new Date(),
): Promise<PublisherDashboard> {
  const ownerCondition = eq(submissions.userId, userId);
  const activityStart = new Date(
    now.getTime() - PUBLISHER_DASHBOARD_ACTIVITY_DAYS * 24 * 60 * 60 * 1000,
  );
  const liveListingCondition = and(
    ownerCondition,
    eq(submissions.status, "published"),
    publicBookmarkCondition(),
  );
  // Keep Date values inside Drizzle's comparison helpers so the timestamp
  // column encoder serializes them correctly under Bun + postgres-js.
  const submissionsInActivityWindow = sql<boolean>`
    ${gte(submissions.createdAt, activityStart)}
    AND ${lte(submissions.createdAt, now)}
  `;
  const latestListingAt = sql<Date>`COALESCE(${bookmarks.publishedAt}, ${bookmarks.updatedAt}, ${bookmarks.createdAt})`;

  const submissionSummaryQuery = db
    .select({
      totalSubmissions: count(),
      inReview: countWhen(
        sql<boolean>`${submissions.status} IN ('pending', 'verified')`,
      ),
      publishedSubmissions: countWhen(
        sql<boolean>`${submissions.status} = 'published'`,
      ),
      rejectedSubmissions: countWhen(
        sql<boolean>`${submissions.status} = 'rejected'`,
      ),
      badgeVerifiedSubmissions: countWhen(
        sql<boolean>`${submissions.badgeVerified}`,
      ),
      badgeVerificationNeeded: countWhen(
        sql<boolean>`
          ${submissions.status} IN ('pending', 'verified')
          AND ${submissions.hasBadge}
          AND NOT ${submissions.badgeVerified}
        `,
      ),
      submissionsLast30Days: countWhen(submissionsInActivityWindow),
    })
    .from(submissions)
    .where(ownerCondition);

  const liveListingSummaryQuery = db
    .select({
      liveListings: count(),
      dofollowListings: countWhen(sql<boolean>`${bookmarks.isDofollow}`),
    })
    .from(submissions)
    .innerJoin(bookmarks, eq(submissions.url, bookmarks.url))
    .where(liveListingCondition);

  const recentLiveListingsQuery = db
    .select({
      id: bookmarks.id,
      title: bookmarks.title,
      slug: bookmarks.slug,
      description: bookmarks.description,
      publishedAt: bookmarks.publishedAt,
    })
    .from(submissions)
    .innerJoin(bookmarks, eq(submissions.url, bookmarks.url))
    .where(liveListingCondition)
    .orderBy(desc(latestListingAt), desc(bookmarks.id))
    .limit(PUBLISHER_DASHBOARD_LIVE_LISTINGS_LIMIT);

  const [submissionSummaryRows, liveListingSummaryRows, recentLiveListings] =
    await Promise.all([
      submissionSummaryQuery,
      liveListingSummaryQuery,
      recentLiveListingsQuery,
    ]);

  const submissionSummary = submissionSummaryRows[0] ?? {
    totalSubmissions: 0,
    inReview: 0,
    publishedSubmissions: 0,
    rejectedSubmissions: 0,
    badgeVerifiedSubmissions: 0,
    badgeVerificationNeeded: 0,
    submissionsLast30Days: 0,
  };
  const liveListingSummary = liveListingSummaryRows[0] ?? {
    liveListings: 0,
    dofollowListings: 0,
  };
  const publishedSubmissions = Number(submissionSummary.publishedSubmissions);
  const rejectedSubmissions = Number(submissionSummary.rejectedSubmissions);

  return {
    summary: {
      totalSubmissions: Number(submissionSummary.totalSubmissions),
      inReview: Number(submissionSummary.inReview),
      publishedSubmissions,
      rejectedSubmissions,
      badgeVerifiedSubmissions: Number(submissionSummary.badgeVerifiedSubmissions),
      badgeVerificationNeeded: Number(submissionSummary.badgeVerificationNeeded),
      submissionsLast30Days: Number(submissionSummary.submissionsLast30Days),
      liveListings: Number(liveListingSummary.liveListings),
      dofollowListings: Number(liveListingSummary.dofollowListings),
      decidedSubmissions: publishedSubmissions + rejectedSubmissions,
      publicationRate: getPublisherPublicationRate(
        publishedSubmissions,
        rejectedSubmissions,
      ),
    },
    liveListings: recentLiveListings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      slug: listing.slug,
      description: listing.description,
      publishedAt: listing.publishedAt,
    })),
  };
}
