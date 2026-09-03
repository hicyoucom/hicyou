import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  bookmarkCategories,
  bookmarks,
  categories,
  submissionCategories,
  submissions,
} from "@/db/schema";

export const MAX_CATEGORIES_PER_ITEM = 3;

export type CategoryAssignmentSource =
  | "manual"
  | "submission"
  | "migration"
  | "ai"
  | "import"
  | "sync";

export class CategoryAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CategoryAssignmentError";
  }
}

/**
 * Produces the canonical category order: primary first, then unique secondary
 * categories. Invalid ids and selections over the product limit fail closed.
 */
export function normalizeCategorySelection(
  primaryCategoryId: number | null | undefined,
  categoryIds: readonly number[] = [],
): number[] {
  const ordered = [primaryCategoryId, ...categoryIds].filter(
    (value): value is number => value !== null && value !== undefined,
  );
  if (ordered.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new CategoryAssignmentError("Category ids must be positive integers");
  }

  const unique = [...new Set(ordered)];
  if (unique.length > MAX_CATEGORIES_PER_ITEM) {
    throw new CategoryAssignmentError(
      `Select at most ${MAX_CATEGORIES_PER_ITEM} categories`,
    );
  }
  return unique;
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function assertAssignableCategories(
  tx: DbTransaction,
  categoryIds: readonly number[],
  allowDraft: boolean,
): Promise<Map<number, string>> {
  if (categoryIds.length === 0) return new Map();

  const rows = await tx
    .select({ id: categories.id, status: categories.status })
    .from(categories)
    .where(
      and(
        inArray(categories.id, [...categoryIds]),
        allowDraft
          ? ne(categories.status, "archived")
          : eq(categories.status, "active"),
      ),
    );

  if (rows.length !== categoryIds.length) {
    throw new CategoryAssignmentError(
      allowDraft
        ? "One or more categories do not exist or are archived"
        : "One or more categories are not available",
    );
  }
  return new Map(rows.map((row) => [row.id, row.status]));
}

export async function replaceBookmarkCategories(
  tx: DbTransaction,
  bookmarkId: number,
  categoryIds: readonly number[],
  options: {
    source?: CategoryAssignmentSource;
    allowDraft?: boolean;
  } = {},
): Promise<void> {
  const normalized = normalizeCategorySelection(categoryIds[0], categoryIds);
  const statuses = await assertAssignableCategories(
    tx,
    normalized,
    options.allowDraft ?? false,
  );
  if (normalized[0] && statuses.get(normalized[0]) !== "active") {
    throw new CategoryAssignmentError(
      "The primary category must be active; draft categories can only be additional categories",
    );
  }

  // Serialize replacement operations for the same bookmark. The uniqueness
  // constraints protect individual rows; this lock protects the delete+insert
  // set replacement as one logical operation.
  await tx.execute(
    sql`select 1 from ${bookmarks} where ${bookmarks.id} = ${bookmarkId} for update`,
  );
  await tx
    .delete(bookmarkCategories)
    .where(eq(bookmarkCategories.bookmarkId, bookmarkId));

  if (normalized.length > 0) {
    await tx.insert(bookmarkCategories).values(
      normalized.map((categoryId, position) => ({
        bookmarkId,
        categoryId,
        position,
        source: options.source ?? "manual",
      })),
    );
  }

  // Compatibility projection for existing callers and API consumers.
  await tx
    .update(bookmarks)
    .set({ categoryId: normalized[0] ?? null })
    .where(eq(bookmarks.id, bookmarkId));
}

/**
 * Adds discovery categories without changing the existing primary category or
 * losing the source of prior assignments. Used by reviewed enrichment output.
 */
export async function addBookmarkCategories(
  tx: DbTransaction,
  bookmarkId: number,
  categoryIds: readonly number[],
  source: CategoryAssignmentSource = "ai",
): Promise<number[]> {
  const requested = normalizeCategorySelection(undefined, categoryIds);

  await tx.execute(
    sql`select 1 from ${bookmarks} where ${bookmarks.id} = ${bookmarkId} for update`,
  );
  const [bookmark] = await tx
    .select({ categoryId: bookmarks.categoryId })
    .from(bookmarks)
    .where(eq(bookmarks.id, bookmarkId))
    .limit(1);
  if (!bookmark) throw new CategoryAssignmentError("Bookmark not found");

  const existingRows = await tx
    .select({
      categoryId: bookmarkCategories.categoryId,
      source: bookmarkCategories.source,
    })
    .from(bookmarkCategories)
    .where(eq(bookmarkCategories.bookmarkId, bookmarkId))
    .orderBy(asc(bookmarkCategories.position));
  const existing =
    existingRows.length > 0
      ? existingRows
      : bookmark.categoryId
        ? [{ categoryId: bookmark.categoryId, source: "migration" }]
        : [];
  const existingIds = new Set(existing.map((row) => row.categoryId));
  const additions = requested.filter((categoryId) => !existingIds.has(categoryId));
  if (additions.length === 0) return [];
  if (existing.length + additions.length > MAX_CATEGORIES_PER_ITEM) {
    throw new CategoryAssignmentError(
      `Bookmark already uses ${existing.length} categories; only ${MAX_CATEGORIES_PER_ITEM} are allowed`,
    );
  }

  await assertAssignableCategories(tx, additions, false);
  const finalAssignments = [
    ...existing,
    ...additions.map((categoryId) => ({ categoryId, source })),
  ];

  // Reinsert the compact ordered set so a legacy/non-contiguous assignment
  // cannot collide with the new position while retaining its original source.
  await tx
    .delete(bookmarkCategories)
    .where(eq(bookmarkCategories.bookmarkId, bookmarkId));
  await tx.insert(bookmarkCategories).values(
    finalAssignments.map((assignment, position) => ({
      bookmarkId,
      categoryId: assignment.categoryId,
      position,
      source: assignment.source as CategoryAssignmentSource,
    })),
  );
  await tx
    .update(bookmarks)
    .set({ categoryId: finalAssignments[0]?.categoryId ?? null })
    .where(eq(bookmarks.id, bookmarkId));

  return additions;
}

export async function replaceSubmissionCategories(
  tx: DbTransaction,
  submissionId: number,
  categoryIds: readonly number[],
): Promise<void> {
  const normalized = normalizeCategorySelection(categoryIds[0], categoryIds);
  await assertAssignableCategories(tx, normalized, false);

  await tx.execute(
    sql`select 1 from ${submissions} where ${submissions.id} = ${submissionId} for update`,
  );
  await tx
    .delete(submissionCategories)
    .where(eq(submissionCategories.submissionId, submissionId));

  if (normalized.length > 0) {
    await tx.insert(submissionCategories).values(
      normalized.map((categoryId, position) => ({
        submissionId,
        categoryId,
        position,
      })),
    );
  }

  await tx
    .update(submissions)
    .set({ categoryId: normalized[0] ?? null })
    .where(eq(submissions.id, submissionId));
}

export async function getSubmissionCategorySelections(
  tx: DbTransaction,
  submissionIds: readonly number[],
  fallbackPrimaryBySubmission: ReadonlyMap<number, number | null>,
): Promise<Map<number, number[]>> {
  const selections = new Map<number, number[]>();
  if (submissionIds.length > 0) {
    const rows = await tx
      .select({
        submissionId: submissionCategories.submissionId,
        categoryId: submissionCategories.categoryId,
      })
      .from(submissionCategories)
      .where(inArray(submissionCategories.submissionId, [...submissionIds]))
      .orderBy(
        submissionCategories.submissionId,
        submissionCategories.position,
      );
    for (const row of rows) {
      const ids = selections.get(row.submissionId) ?? [];
      ids.push(row.categoryId);
      selections.set(row.submissionId, ids);
    }
  }

  for (const submissionId of submissionIds) {
    if (selections.has(submissionId)) continue;
    const fallback = fallbackPrimaryBySubmission.get(submissionId);
    selections.set(submissionId, fallback ? [fallback] : []);
  }
  return selections;
}
