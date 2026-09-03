import { db } from "@/db/client";
import { bookmarks, submissions } from "@/db/schema";
import {
  MAX_SUBMISSION_STATUS_CENTER_PAGE,
  SUBMISSION_STATUS_CENTER_PAGE_SIZE,
  type SubmissionStatusFilter,
} from "@/lib/submission-status";
import { and, count, desc, eq, sql } from "drizzle-orm";

export interface SubmissionStatusCounts {
  total: number;
  pending: number;
  verified: number;
  published: number;
  rejected: number;
  unclassified: number;
}

export interface SubmissionStatusCenterEntry {
  id: number;
  url: string;
  title: string;
  tagline: string | null;
  status: string;
  hasBadge: boolean;
  badgeVerified: boolean;
  badgeVerifiedAt: Date | null;
  publishAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  publicListingSlug: string | null;
}

export interface SubmissionStatusCenter {
  entries: SubmissionStatusCenterEntry[];
  counts: SubmissionStatusCounts;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Returns only the fields a signed-in submitter needs for their status center.
 * Ownership is an unconditional part of every query; this helper must never be
 * used with an untrusted user ID from a request parameter.
 */
export async function getSubmissionStatusCenter(
  userId: string,
  options: {
    status?: SubmissionStatusFilter;
    page?: number;
  } = {},
): Promise<SubmissionStatusCenter> {
  const status = options.status ?? "all";
  const page =
    options.page && Number.isSafeInteger(options.page) && options.page > 0
      ? Math.min(options.page, MAX_SUBMISSION_STATUS_CENTER_PAGE)
      : 1;
  const ownerCondition = eq(submissions.userId, userId);
  const listCondition =
    status === "all"
      ? ownerCondition
      : and(ownerCondition, eq(submissions.status, status));

  const summaryQuery = db
    .select({
      total: count(),
      pending: sql<number>`count(*) FILTER (WHERE ${submissions.status} = 'pending')::int`,
      verified: sql<number>`count(*) FILTER (WHERE ${submissions.status} = 'verified')::int`,
      published: sql<number>`count(*) FILTER (WHERE ${submissions.status} = 'published')::int`,
      rejected: sql<number>`count(*) FILTER (WHERE ${submissions.status} = 'rejected')::int`,
    })
    .from(submissions)
    .where(ownerCondition);

  const listRows = (rowOffset: number) =>
    db
      .select({
        id: submissions.id,
        url: submissions.url,
        title: submissions.title,
        tagline: submissions.tagline,
        status: submissions.status,
        hasBadge: submissions.hasBadge,
        badgeVerified: submissions.badgeVerified,
        badgeVerifiedAt: submissions.badgeVerifiedAt,
        publishAt: submissions.publishAt,
        createdAt: submissions.createdAt,
        updatedAt: submissions.updatedAt,
        listingSlug: bookmarks.slug,
        listingStatus: bookmarks.status,
        listingArchived: bookmarks.isArchived,
        listingDeletedAt: bookmarks.deletedAt,
      })
      .from(submissions)
      .leftJoin(bookmarks, eq(submissions.url, bookmarks.url))
      .where(listCondition)
      .orderBy(desc(submissions.createdAt), desc(submissions.id))
      .limit(SUBMISSION_STATUS_CENTER_PAGE_SIZE)
      .offset(rowOffset);

  const filteredCountQuery =
    status === "all"
      ? Promise.resolve(null)
      : db.select({ total: count() }).from(submissions).where(listCondition);

  // Query page one eagerly with the summary. For a large out-of-range page,
  // wait for the count before issuing any offset query so a crafted `page`
  // parameter cannot force needless deep scans.
  const firstPageRows = page === 1 ? listRows(0) : Promise.resolve(null);
  const [summaryRows, filteredCountRows, initialRows] = await Promise.all([
    summaryQuery,
    filteredCountQuery,
    firstPageRows,
  ]);

  const summary = summaryRows[0] ?? {
    total: 0,
    pending: 0,
    verified: 0,
    published: 0,
    rejected: 0,
  };
  const counts = {
    total: Number(summary.total),
    pending: Number(summary.pending),
    verified: Number(summary.verified),
    published: Number(summary.published),
    rejected: Number(summary.rejected),
    unclassified: 0,
  } satisfies SubmissionStatusCounts;
  counts.unclassified = Math.max(
    0,
    counts.total -
      counts.pending -
      counts.verified -
      counts.published -
      counts.rejected,
  );

  const total =
    status === "all"
      ? counts.total
      : Number(filteredCountRows?.[0]?.total ?? 0);
  const totalPages = Math.max(
    1,
    Math.ceil(total / SUBMISSION_STATUS_CENTER_PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const pageRows =
    currentPage === 1 && initialRows !== null
      ? initialRows
      : await listRows(
          (currentPage - 1) * SUBMISSION_STATUS_CENTER_PAGE_SIZE,
        );

  return {
    entries: pageRows.map((row) => ({
      id: row.id,
      url: row.url,
      title: row.title,
      tagline: row.tagline,
      status: row.status,
      hasBadge: row.hasBadge,
      badgeVerified: row.badgeVerified,
      badgeVerifiedAt: row.badgeVerifiedAt,
      publishAt: row.publishAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      publicListingSlug:
        row.listingSlug &&
        row.listingStatus === "published" &&
        row.listingArchived === false &&
        row.listingDeletedAt === null
          ? row.listingSlug
          : null,
    })),
    counts,
    page: currentPage,
    pageSize: SUBMISSION_STATUS_CENTER_PAGE_SIZE,
    total,
    totalPages,
  };
}
