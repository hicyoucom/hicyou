import {
  and,
  asc,
  desc,
  eq,
  inArray,
  lt,
  sql,
} from "drizzle-orm";

import { db } from "@/db/client";
import {
  bookmarkCategories,
  bookmarks,
  categories,
  categoryAssignmentCandidates,
  categoryEnrichmentRunBookmarks,
  categoryEnrichmentRuns,
} from "@/db/schema";
import { addBookmarkCategories } from "@/lib/category-assignments";
import {
  CATEGORY_ENRICHMENT_BATCH_SIZE,
  CATEGORY_ENRICHMENT_MAX_RUN_SIZE,
  ENRICHMENT_CATEGORY_SLUGS,
  normalizeCategoryEnrichmentSuggestions,
} from "@/lib/category-enrichment-candidates";
import {
  classifyBookmarks,
  isCategoryClassifierConfigured,
  type CategorySourceBookmark,
} from "@/lib/category-classifier";
import { logger } from "@/lib/logger";
import { getLLMConfig } from "@/lib/llm";
import { publicBookmarkCondition } from "@/lib/public-bookmark";

const RUN_STALE_AFTER_MS = 15 * 60 * 1_000;
const RUN_LOCK_KEY = "hicyou-category-enrichment";
// The domestic GLM endpoint becomes prone to closing sockets under four
// simultaneous long-running requests. Two keeps throughput reasonable while
// materially improving batch completion reliability.
const CATEGORY_ENRICHMENT_CONCURRENCY = 2;

export type CategoryEnrichmentRunResult =
  | { outcome: "not_configured" }
  | { outcome: "in_progress"; runId: number }
  | {
      outcome: "completed";
      runId: number;
      sourceBookmarkCount: number;
      processedCount: number;
      candidateCount: number;
      errorCount: number;
    }
  | { outcome: "failed"; runId: number | null };

export type CategoryEnrichmentCandidateView = {
  id: number;
  runId: number;
  bookmarkId: number;
  bookmarkTitle: string;
  bookmarkSlug: string;
  bookmarkUrl: string;
  currentCategories: string[];
  categoryName: string;
  categorySlug: string;
  confidence: number;
  rationale: string;
  rank: number;
  status: string;
  model: string;
  createdAt: string;
};

export type CategoryEnrichmentRunView = {
  id: number;
  model: string;
  status: string;
  sourceBookmarkCount: number;
  processedCount: number;
  candidateCount: number;
  errorCount: number;
  startedAt: string;
  finishedAt: string | null;
};

type CategoryEnrichmentBatchResult = {
  processed: number;
  inserted: number;
  errors: number;
  bookmarkResults: Array<{
    bookmarkId: number;
    status: "processed" | "failed";
    candidateCount: number;
    error: string | null;
  }>;
};

function clampRunLimit(value: number | undefined): number {
  if (!Number.isInteger(value) || !value || value < 1) return 100;
  return Math.min(value, CATEGORY_ENRICHMENT_MAX_RUN_SIZE);
}

function compactJson(value: unknown): string {
  try {
    return JSON.stringify(value) || "";
  } catch {
    return "";
  }
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function claimRun(requestedBy: string | null, model: string): Promise<
  | { kind: "claimed"; id: number }
  | { kind: "in_progress"; id: number }
> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${RUN_LOCK_KEY}))`);
    const staleCutoff = new Date(Date.now() - RUN_STALE_AFTER_MS);
    await tx
      .update(categoryEnrichmentRuns)
      .set({
        status: "failed",
        error: "Run exceeded the stale timeout",
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(categoryEnrichmentRuns.status, "running"),
          lt(categoryEnrichmentRuns.startedAt, staleCutoff),
        ),
      );

    const [running] = await tx
      .select({ id: categoryEnrichmentRuns.id })
      .from(categoryEnrichmentRuns)
      .where(eq(categoryEnrichmentRuns.status, "running"))
      .orderBy(desc(categoryEnrichmentRuns.startedAt))
      .limit(1);
    if (running) return { kind: "in_progress" as const, id: running.id };

    const [created] = await tx
      .insert(categoryEnrichmentRuns)
      .values({ model, requestedBy })
      .returning({ id: categoryEnrichmentRuns.id });
    return { kind: "claimed" as const, id: created.id };
  });
}

async function getEnrichmentCategoryDefinitions() {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
    })
    .from(categories)
    .where(
      and(
        eq(categories.status, "active"),
        inArray(categories.slug, [...ENRICHMENT_CATEGORY_SLUGS]),
      ),
    )
    .orderBy(asc(categories.sortOrder), asc(categories.id));
}

async function getEnrichmentSource(limit: number): Promise<CategorySourceBookmark[]> {
  const rows = await db
    .select({
      id: bookmarks.id,
      title: bookmarks.title,
      url: bookmarks.url,
      description: bookmarks.description,
      overview: bookmarks.overview,
      whyStartups: bookmarks.whyStartups,
      keyFeatures: bookmarks.keyFeatures,
      useCases: bookmarks.useCases,
      primaryCategory: categories.name,
    })
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(
      and(
        publicBookmarkCondition(),
        sql`(
          select count(*)
          from ${bookmarkCategories} existing_assignment
          where existing_assignment.bookmark_id = ${bookmarks.id}
        ) < 3`,
        sql`not exists (
          select 1
          from ${categoryEnrichmentRunBookmarks} prior_source
          where prior_source.bookmark_id = ${bookmarks.id}
            and prior_source.status = 'processed'
        )`,
      ),
    )
    // A deterministic hash gives the first review run broad coverage instead
    // of taking a single old primary category in insertion order.
    .orderBy(sql`md5(${bookmarks.id}::text)`)
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    primaryCategory: row.primaryCategory || "Uncategorized",
    description: row.description || "",
    overview: row.overview || "",
    whyStartups: row.whyStartups || "",
    keyFeatures: compactJson(row.keyFeatures),
    useCases: compactJson(row.useCases),
  }));
}

async function getExistingCategorySlugs(
  bookmarkIds: number[],
): Promise<Map<number, Set<string>>> {
  const output = new Map<number, Set<string>>();
  if (bookmarkIds.length === 0) return output;
  const rows = await db
    .select({
      bookmarkId: bookmarkCategories.bookmarkId,
      slug: categories.slug,
    })
    .from(bookmarkCategories)
    .innerJoin(categories, eq(bookmarkCategories.categoryId, categories.id))
    .where(inArray(bookmarkCategories.bookmarkId, bookmarkIds))
    .orderBy(bookmarkCategories.bookmarkId, bookmarkCategories.position);
  for (const row of rows) {
    const slugs = output.get(row.bookmarkId) ?? new Set<string>();
    slugs.add(row.slug);
    output.set(row.bookmarkId, slugs);
  }
  return output;
}

export async function runCategoryEnrichment(input: {
  requestedBy?: string | null;
  limit?: number;
}): Promise<CategoryEnrichmentRunResult> {
  if (!isCategoryClassifierConfigured()) return { outcome: "not_configured" };

  let runId: number | null = null;
  try {
    const claim = await claimRun(
      input.requestedBy ?? null,
      getLLMConfig().model,
    );
    if (claim.kind === "in_progress") {
      return { outcome: "in_progress", runId: claim.id };
    }
    runId = claim.id;

    const limit = clampRunLimit(input.limit);
    const [source, definitions] = await Promise.all([
      getEnrichmentSource(limit),
      getEnrichmentCategoryDefinitions(),
    ]);
    if (definitions.length !== ENRICHMENT_CATEGORY_SLUGS.length) {
      throw new Error("The active enrichment taxonomy is incomplete");
    }

    await db
      .update(categoryEnrichmentRuns)
      .set({ sourceBookmarkCount: source.length, updatedAt: new Date() })
      .where(eq(categoryEnrichmentRuns.id, runId));
    if (source.length > 0) {
      await db.insert(categoryEnrichmentRunBookmarks).values(
        source.map((bookmark) => ({
          runId: runId!,
          bookmarkId: bookmark.id,
          status: "pending",
        })),
      );
    }

    const existingSlugsByBookmark = await getExistingCategorySlugs(
      source.map((bookmark) => bookmark.id),
    );
    const categoryIdBySlug = new Map(
      definitions.map((category) => [category.slug, category.id]),
    );
    let processedCount = 0;
    let candidateCount = 0;
    let errorCount = 0;

    const batches = chunk(source, CATEGORY_ENRICHMENT_BATCH_SIZE);
    const batchGroups = chunk(batches, CATEGORY_ENRICHMENT_CONCURRENCY);
    for (const batchGroup of batchGroups) {
      const results = await Promise.all(
        batchGroup.map(async (batch): Promise<CategoryEnrichmentBatchResult> => {
          try {
            const raw = await classifyBookmarks({
              bookmarks: batch,
              categories: definitions.map((category) => ({
                slug: category.slug,
                name: category.name,
                description: category.description || "",
              })),
            });
            const suggestions = normalizeCategoryEnrichmentSuggestions(raw, {
              validBookmarkIds: batch.map((bookmark) => bookmark.id),
              activeCategorySlugs: definitions.map((category) => category.slug),
              existingSlugsByBookmark,
            });
            const inserted =
              suggestions.length === 0
                ? []
                : await db
                    .insert(categoryAssignmentCandidates)
                    .values(
                      suggestions.map((suggestion) => ({
                        runId: runId!,
                        bookmarkId: suggestion.bookmarkId,
                        categoryId: categoryIdBySlug.get(
                          suggestion.categorySlug,
                        )!,
                        rank: suggestion.rank,
                        confidenceBasisPoints:
                          suggestion.confidenceBasisPoints,
                        rationale: suggestion.rationale,
                      })),
                    )
                    .onConflictDoNothing()
                    .returning({
                      bookmarkId: categoryAssignmentCandidates.bookmarkId,
                    });
            const insertedCountByBookmark = new Map<number, number>();
            for (const candidate of inserted) {
              insertedCountByBookmark.set(
                candidate.bookmarkId,
                (insertedCountByBookmark.get(candidate.bookmarkId) ?? 0) + 1,
              );
            }
            return {
              processed: batch.length,
              inserted: inserted.length,
              errors: 0,
              bookmarkResults: batch.map((bookmark) => ({
                bookmarkId: bookmark.id,
                status: "processed",
                candidateCount:
                  insertedCountByBookmark.get(bookmark.id) ?? 0,
                error: null,
              })),
            };
          } catch (error) {
            logger.error("[category-enrichment] GLM batch failed:", error);
            return {
              processed: batch.length,
              inserted: 0,
              errors: batch.length,
              bookmarkResults: batch.map((bookmark) => ({
                bookmarkId: bookmark.id,
                status: "failed",
                candidateCount: 0,
                error: "GLM batch failed",
              })),
            };
          }
        }),
      );
      processedCount += results.reduce((sum, result) => sum + result.processed, 0);
      candidateCount += results.reduce((sum, result) => sum + result.inserted, 0);
      errorCount += results.reduce((sum, result) => sum + result.errors, 0);
      const bookmarkResults = results.flatMap((result) => result.bookmarkResults);
      await db
        .insert(categoryEnrichmentRunBookmarks)
        .values(
          bookmarkResults.map((result) => ({
            runId: runId!,
            bookmarkId: result.bookmarkId,
            status: result.status,
            candidateCount: result.candidateCount,
            error: result.error,
            updatedAt: new Date(),
          })),
        )
        .onConflictDoUpdate({
          target: [
            categoryEnrichmentRunBookmarks.runId,
            categoryEnrichmentRunBookmarks.bookmarkId,
          ],
          set: {
            status: sql`excluded."status"`,
            candidateCount: sql`excluded."candidate_count"`,
            error: sql`excluded."error"`,
            updatedAt: new Date(),
          },
        });
      await db
        .update(categoryEnrichmentRuns)
        .set({ processedCount, candidateCount, errorCount, updatedAt: new Date() })
        .where(eq(categoryEnrichmentRuns.id, runId));
    }

    const now = new Date();
    const allFailed = source.length > 0 && errorCount === source.length;
    await db
      .update(categoryEnrichmentRuns)
      .set({
        status: allFailed ? "failed" : "succeeded",
        error: errorCount > 0 ? `${errorCount} bookmarks could not be classified` : null,
        processedCount,
        candidateCount,
        errorCount,
        finishedAt: now,
        updatedAt: now,
      })
      .where(eq(categoryEnrichmentRuns.id, runId));

    return allFailed
      ? { outcome: "failed", runId }
      : {
          outcome: "completed",
          runId,
          sourceBookmarkCount: source.length,
          processedCount,
          candidateCount,
          errorCount,
        };
  } catch (error) {
    logger.error("[category-enrichment] run failed:", error);
    if (runId !== null) {
      const now = new Date();
      await db
        .update(categoryEnrichmentRuns)
        .set({
          status: "failed",
          error: "Category enrichment failed; see application logs",
          finishedAt: now,
          updatedAt: now,
        })
        .where(eq(categoryEnrichmentRuns.id, runId))
        .catch((updateError) =>
          logger.error("[category-enrichment] failed to close run:", updateError),
        );
    }
    return { outcome: "failed", runId };
  }
}

export async function getCategoryEnrichmentDashboardData(): Promise<{
  candidates: CategoryEnrichmentCandidateView[];
  runs: CategoryEnrichmentRunView[];
  statusCounts: Record<string, number>;
}> {
  const [candidateRows, runRows, statusRows] = await Promise.all([
    db
      .select({
        id: categoryAssignmentCandidates.id,
        runId: categoryAssignmentCandidates.runId,
        bookmarkId: categoryAssignmentCandidates.bookmarkId,
        bookmarkTitle: bookmarks.title,
        bookmarkSlug: bookmarks.slug,
        bookmarkUrl: bookmarks.url,
        categoryName: categories.name,
        categorySlug: categories.slug,
        confidenceBasisPoints:
          categoryAssignmentCandidates.confidenceBasisPoints,
        rationale: categoryAssignmentCandidates.rationale,
        rank: categoryAssignmentCandidates.rank,
        status: categoryAssignmentCandidates.status,
        model: categoryEnrichmentRuns.model,
        createdAt: categoryAssignmentCandidates.createdAt,
      })
      .from(categoryAssignmentCandidates)
      .innerJoin(bookmarks, eq(categoryAssignmentCandidates.bookmarkId, bookmarks.id))
      .innerJoin(categories, eq(categoryAssignmentCandidates.categoryId, categories.id))
      .innerJoin(
        categoryEnrichmentRuns,
        eq(categoryAssignmentCandidates.runId, categoryEnrichmentRuns.id),
      )
      .where(eq(categoryAssignmentCandidates.status, "pending"))
      .orderBy(
        desc(categoryAssignmentCandidates.confidenceBasisPoints),
        asc(categoryAssignmentCandidates.id),
      )
      .limit(250),
    db
      .select()
      .from(categoryEnrichmentRuns)
      .orderBy(desc(categoryEnrichmentRuns.startedAt), desc(categoryEnrichmentRuns.id))
      .limit(10),
    db
      .select({
        status: categoryAssignmentCandidates.status,
        count: sql<number>`count(*)::int`,
      })
      .from(categoryAssignmentCandidates)
      .groupBy(categoryAssignmentCandidates.status),
  ]);

  const bookmarkIds = Array.from(
    new Set(candidateRows.map((candidate) => candidate.bookmarkId)),
  );
  const assignedRows =
    bookmarkIds.length === 0
      ? []
      : await db
          .select({
            bookmarkId: bookmarkCategories.bookmarkId,
            categoryName: categories.name,
          })
          .from(bookmarkCategories)
          .innerJoin(categories, eq(bookmarkCategories.categoryId, categories.id))
          .where(inArray(bookmarkCategories.bookmarkId, bookmarkIds))
          .orderBy(bookmarkCategories.bookmarkId, bookmarkCategories.position);
  const currentCategoriesByBookmark = new Map<number, string[]>();
  for (const row of assignedRows) {
    const names = currentCategoriesByBookmark.get(row.bookmarkId) ?? [];
    names.push(row.categoryName);
    currentCategoriesByBookmark.set(row.bookmarkId, names);
  }

  return {
    candidates: candidateRows.map((candidate) => ({
      ...candidate,
      confidence: candidate.confidenceBasisPoints / 10_000,
      currentCategories:
        currentCategoriesByBookmark.get(candidate.bookmarkId) ?? [],
      createdAt: candidate.createdAt.toISOString(),
    })),
    runs: runRows.map((run) => ({
      id: run.id,
      model: run.model,
      status: run.status,
      sourceBookmarkCount: run.sourceBookmarkCount,
      processedCount: run.processedCount,
      candidateCount: run.candidateCount,
      errorCount: run.errorCount,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
    })),
    statusCounts: Object.fromEntries(
      statusRows.map((row) => [row.status, row.count]),
    ),
  };
}

export async function reviewCategoryEnrichmentCandidates(input: {
  candidateIds: number[];
  decision: "approve" | "reject";
  reviewedBy: string;
}): Promise<{ applied: number; rejected: number; failedBookmarkIds: number[] }> {
  const candidateIds = Array.from(
    new Set(input.candidateIds.filter((id) => Number.isSafeInteger(id) && id > 0)),
  ).slice(0, 250);
  if (candidateIds.length === 0) {
    return { applied: 0, rejected: 0, failedBookmarkIds: [] };
  }

  const candidatesToReview = await db
    .select({
      id: categoryAssignmentCandidates.id,
      bookmarkId: categoryAssignmentCandidates.bookmarkId,
      categoryId: categoryAssignmentCandidates.categoryId,
      rank: categoryAssignmentCandidates.rank,
    })
    .from(categoryAssignmentCandidates)
    .where(
      and(
        inArray(categoryAssignmentCandidates.id, candidateIds),
        eq(categoryAssignmentCandidates.status, "pending"),
      ),
    )
    .orderBy(
      categoryAssignmentCandidates.bookmarkId,
      categoryAssignmentCandidates.rank,
    );
  if (candidatesToReview.length === 0) {
    return { applied: 0, rejected: 0, failedBookmarkIds: [] };
  }

  const now = new Date();
  if (input.decision === "reject") {
    const rejected = await db
      .update(categoryAssignmentCandidates)
      .set({
        status: "rejected",
        reviewedBy: input.reviewedBy,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(
        inArray(
          categoryAssignmentCandidates.id,
          candidatesToReview.map((candidate) => candidate.id),
        ),
      )
      .returning({ id: categoryAssignmentCandidates.id });
    return { applied: 0, rejected: rejected.length, failedBookmarkIds: [] };
  }

  const candidatesByBookmark = new Map<number, typeof candidatesToReview>();
  for (const candidate of candidatesToReview) {
    const grouped = candidatesByBookmark.get(candidate.bookmarkId) ?? [];
    grouped.push(candidate);
    candidatesByBookmark.set(candidate.bookmarkId, grouped);
  }

  let applied = 0;
  const failedBookmarkIds: number[] = [];
  for (const [bookmarkId, groupedCandidates] of candidatesByBookmark) {
    try {
      const appliedForBookmark = await db.transaction(async (tx) => {
        await addBookmarkCategories(
          tx,
          bookmarkId,
          groupedCandidates.map((candidate) => candidate.categoryId),
          "ai",
        );
        const updated = await tx
          .update(categoryAssignmentCandidates)
          .set({
            status: "applied",
            reviewedBy: input.reviewedBy,
            reviewedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              inArray(
                categoryAssignmentCandidates.id,
                groupedCandidates.map((candidate) => candidate.id),
              ),
              eq(categoryAssignmentCandidates.status, "pending"),
            ),
          )
          .returning({ id: categoryAssignmentCandidates.id });
        return updated.length;
      });
      applied += appliedForBookmark;
    } catch (error) {
      failedBookmarkIds.push(bookmarkId);
      logger.error(
        `[category-enrichment] could not apply candidates for bookmark ${bookmarkId}:`,
        error,
      );
    }
  }

  return { applied, rejected: 0, failedBookmarkIds };
}
