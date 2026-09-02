import { and, desc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { bookmarks } from "@/db/schema";
import {
  BOOKMARK_QUALITY_RULES,
  getBookmarkQualityCoverage,
  getBookmarkQualityIssues,
  getBookmarkQualityScore,
  type BookmarkQualityIssue,
} from "@/lib/bookmark-quality";

export const BOOKMARK_QUALITY_REVIEW_LIMIT = 50;

export type BookmarkQualityIssueCount = {
  issue: BookmarkQualityIssue;
  count: number;
};

export type BookmarkQualityReviewItem = {
  id: number;
  title: string;
  slug: string;
  url: string;
  updatedAt: Date | null;
  issues: BookmarkQualityIssue[];
  score: number;
};

export type BookmarkQualityReport = {
  activeListings: number;
  completeListings: number;
  needsReview: number;
  completeRate: number | null;
  fieldCoverageRate: number | null;
  issueCounts: BookmarkQualityIssueCount[];
  reviewQueue: BookmarkQualityReviewItem[];
};

const activeListingCondition = and(
  eq(bookmarks.status, "published"),
  eq(bookmarks.isArchived, false),
  isNull(bookmarks.deletedAt),
);

// Keep these SQL predicates aligned with getBookmarkQualityIssues(). The
// CASE expressions protect json_array_length() from legacy JSON objects.
const missingCategory = sql<boolean>`${bookmarks.categoryId} IS NULL`;
// ECMAScript String#trim removes this exact whitespace set. PostgreSQL's
// default btrim()/POSIX space class excludes some of it (for example NBSP),
// so translate() keeps the aggregate and the in-memory policy consistent.
const ECMASCRIPT_TRIM_CHARACTERS =
  " \t\n\u000b\f\r\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff";
const missingDescription = sql<boolean>`(${bookmarks.description} IS NULL OR translate(${bookmarks.description}, ${ECMASCRIPT_TRIM_CHARACTERS}, '') = '')`;
const missingOverview = sql<boolean>`(${bookmarks.overview} IS NULL OR translate(${bookmarks.overview}, ${ECMASCRIPT_TRIM_CHARACTERS}, '') = '')`;
const missingFavicon = sql<boolean>`(${bookmarks.favicon} IS NULL OR translate(${bookmarks.favicon}, ${ECMASCRIPT_TRIM_CHARACTERS}, '') = '')`;
const missingOgImage = sql<boolean>`(${bookmarks.ogImage} IS NULL OR translate(${bookmarks.ogImage}, ${ECMASCRIPT_TRIM_CHARACTERS}, '') = '')`;
const missingKeyFeatures = sql<boolean>`
  CASE
    WHEN ${bookmarks.keyFeatures} IS NULL THEN true
    WHEN json_typeof(${bookmarks.keyFeatures}) <> 'array' THEN true
    ELSE json_array_length(${bookmarks.keyFeatures}) = 0
  END
`;
const missingUseCases = sql<boolean>`
  CASE
    WHEN ${bookmarks.useCases} IS NULL THEN true
    WHEN json_typeof(${bookmarks.useCases}) <> 'array' THEN true
    ELSE json_array_length(${bookmarks.useCases}) = 0
  END
`;

const missingConditions: Record<BookmarkQualityIssue, SQL<boolean>> = {
  category: missingCategory,
  description: missingDescription,
  overview: missingOverview,
  favicon: missingFavicon,
  ogImage: missingOgImage,
  keyFeatures: missingKeyFeatures,
  useCases: missingUseCases,
};

function countWhen(condition: SQL<boolean>): SQL<number> {
  return sql<number>`count(*) FILTER (WHERE ${condition})::int`;
}

function oneWhen(condition: SQL<boolean>): SQL<number> {
  return sql<number>`CASE WHEN ${condition} THEN 1 ELSE 0 END`;
}

const missingFieldCount = sql<number>`(
  ${sql.join(
    BOOKMARK_QUALITY_RULES.map((rule) => oneWhen(missingConditions[rule.key])),
    sql.raw(" + "),
  )}
)`;

const missingFieldTotal = sql<number>`COALESCE(SUM(${missingFieldCount}), 0)::int`;

function emptyReport(): BookmarkQualityReport {
  return {
    activeListings: 0,
    completeListings: 0,
    needsReview: 0,
    completeRate: null,
    fieldCoverageRate: null,
    issueCounts: BOOKMARK_QUALITY_RULES.map((rule) => ({
      issue: rule.key,
      count: 0,
    })),
    reviewQueue: [],
  };
}

/**
 * Read-only content-completeness report for the live public directory.
 *
 * It never performs outbound URL checks or lifecycle mutations. A missing
 * field becomes a review signal, not evidence that the publisher is broken.
 */
export async function getBookmarkQualityReport(): Promise<BookmarkQualityReport> {
  if (!process.env.DATABASE_URL) return emptyReport();

  const summaryQuery = db
    .select({
      activeListings: sql<number>`count(*)::int`,
      needsReview: countWhen(sql<boolean>`${missingFieldCount} > 0`),
      missingFields: missingFieldTotal,
      missingCategory: countWhen(missingCategory),
      missingDescription: countWhen(missingDescription),
      missingOverview: countWhen(missingOverview),
      missingFavicon: countWhen(missingFavicon),
      missingOgImage: countWhen(missingOgImage),
      missingKeyFeatures: countWhen(missingKeyFeatures),
      missingUseCases: countWhen(missingUseCases),
    })
    .from(bookmarks)
    .where(activeListingCondition);

  const queueQuery = db
    .select({
      id: bookmarks.id,
      title: bookmarks.title,
      slug: bookmarks.slug,
      url: bookmarks.url,
      updatedAt: bookmarks.updatedAt,
      categoryId: bookmarks.categoryId,
      description: bookmarks.description,
      overview: bookmarks.overview,
      favicon: bookmarks.favicon,
      ogImage: bookmarks.ogImage,
      keyFeatures: bookmarks.keyFeatures,
      useCases: bookmarks.useCases,
      missingFields: missingFieldCount,
    })
    .from(bookmarks)
    .where(and(activeListingCondition, sql`${missingFieldCount} > 0`))
    .orderBy(
      desc(missingFieldCount),
      desc(bookmarks.updatedAt),
      desc(bookmarks.id),
    )
    .limit(BOOKMARK_QUALITY_REVIEW_LIMIT);

  const [summaryRows, queueRows] = await Promise.all([
    summaryQuery,
    queueQuery,
  ]);
  const summary = summaryRows[0];
  if (!summary) return emptyReport();

  const activeListings = Number(summary.activeListings);
  const needsReview = Number(summary.needsReview);
  const issueCountByKey: Record<BookmarkQualityIssue, number> = {
    category: Number(summary.missingCategory),
    description: Number(summary.missingDescription),
    overview: Number(summary.missingOverview),
    favicon: Number(summary.missingFavicon),
    ogImage: Number(summary.missingOgImage),
    keyFeatures: Number(summary.missingKeyFeatures),
    useCases: Number(summary.missingUseCases),
  };

  return {
    activeListings,
    completeListings: Math.max(0, activeListings - needsReview),
    needsReview,
    completeRate:
      activeListings > 0
        ? (activeListings - needsReview) / activeListings
        : null,
    fieldCoverageRate: getBookmarkQualityCoverage(
      activeListings,
      Number(summary.missingFields),
    ),
    issueCounts: BOOKMARK_QUALITY_RULES.map((rule) => ({
      issue: rule.key,
      count: issueCountByKey[rule.key],
    })),
    reviewQueue: queueRows.map((row) => {
      const issues = getBookmarkQualityIssues(row);
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        url: row.url,
        updatedAt: row.updatedAt,
        issues,
        score: getBookmarkQualityScore(issues),
      };
    }),
  };
}
