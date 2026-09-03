import { inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { bookmarks } from "@/db/schema";
import {
  normalizeCategorySelection,
  replaceBookmarkCategories,
} from "@/lib/category-assignments";
import { logger } from "@/lib/logger";
import { reserveUniqueSlugs } from "@/lib/slug";

type BookmarkInsert = typeof bookmarks.$inferInsert;

export type BookmarkBatchItem = Partial<BookmarkInsert> & {
  url: string;
  title: string;
  categoryIds?: number[];
};

export type BookmarkBatchResult = {
  url: string;
  status: "created" | "skipped_exists" | "error";
  error?: string;
};

const INSERT_CHUNK = 100;

function toRow(item: BookmarkBatchItem): BookmarkInsert {
  const now = new Date();
  return {
    title: item.title,
    description: item.description,
    overview: item.overview,
    url: item.url,
    slug: item.slug!,
    favicon: item.favicon,
    ogImage: item.ogImage,
    categoryId: item.categoryId ?? null,
    isFavorite: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    keyFeatures: item.keyFeatures ?? [],
    useCases: item.useCases ?? [],
    faqs: item.faqs ?? [],
    whyStartups: item.whyStartups ?? null,
    alternatives: item.alternatives ?? null,
  };
}

function categoryIdsForItem(item: BookmarkBatchItem): number[] {
  return normalizeCategorySelection(item.categoryId, item.categoryIds ?? []);
}

function isExistingUrlViolation(error: unknown): boolean {
  const postgresError = error as {
    code?: string;
    constraint?: string;
    constraint_name?: string;
  };
  const constraint =
    postgresError.constraint_name ?? postgresError.constraint ?? "";
  return (
    postgresError.code === "23505" && constraint === "bookmarks_url_unique"
  );
}

async function assignMissingSlugs(
  items: readonly BookmarkBatchItem[],
): Promise<BookmarkBatchItem[]> {
  const missing = items.filter((item) => !item.slug);
  const generated = await reserveUniqueSlugs(missing.map((item) => item.title));
  let generatedIndex = 0;

  return items.map((item) => {
    if (item.slug) return item;
    const slug = generated[generatedIndex];
    generatedIndex += 1;
    return { ...item, slug };
  });
}

async function insertIndividually(
  items: readonly BookmarkBatchItem[],
  indices: readonly number[],
  results: BookmarkBatchResult[],
): Promise<void> {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    try {
      await db.transaction(async (transaction) => {
        const [created] = await transaction
          .insert(bookmarks)
          .values(toRow(item))
          .returning({ id: bookmarks.id });
        await replaceBookmarkCategories(
          transaction,
          created.id,
          categoryIdsForItem(item),
          { source: "import", allowDraft: true },
        );
      });
      results[indices[index]] = { url: item.url, status: "created" };
    } catch (error) {
      if (isExistingUrlViolation(error)) {
        results[indices[index]] = {
          url: item.url,
          status: "skipped_exists",
        };
        continue;
      }

      logger.error("Bookmark import failed", { url: item.url, error });
      results[indices[index]] = {
        url: item.url,
        status: "error",
        error: "Bookmark could not be imported",
      };
    }
  }
}

/**
 * Idempotently imports bookmarks and their ordered category assignments.
 * Results remain index-aligned with the supplied payload.
 */
export async function importBookmarkBatch(
  items: readonly BookmarkBatchItem[],
): Promise<BookmarkBatchResult[]> {
  const results: BookmarkBatchResult[] = new Array(items.length);
  const seenUrls = new Set<string>();
  const candidates: BookmarkBatchItem[] = [];
  const candidateIndices: number[] = [];

  items.forEach((item, index) => {
    if (seenUrls.has(item.url)) {
      results[index] = { url: item.url, status: "skipped_exists" };
      return;
    }
    seenUrls.add(item.url);
    candidates.push(item);
    candidateIndices.push(index);
  });

  const existingRows = candidates.length
    ? await db
        .select({ url: bookmarks.url })
        .from(bookmarks)
        .where(
          inArray(
            bookmarks.url,
            candidates.map((item) => item.url),
          ),
        )
    : [];
  const existingUrls = new Set(existingRows.map((row) => row.url));
  const pendingItems: BookmarkBatchItem[] = [];
  const pendingIndices: number[] = [];

  candidates.forEach((item, candidateIndex) => {
    const resultIndex = candidateIndices[candidateIndex];
    if (existingUrls.has(item.url)) {
      results[resultIndex] = { url: item.url, status: "skipped_exists" };
      return;
    }
    pendingItems.push(item);
    pendingIndices.push(resultIndex);
  });

  const preparedItems = await assignMissingSlugs(pendingItems);
  for (let offset = 0; offset < preparedItems.length; offset += INSERT_CHUNK) {
    const chunk = preparedItems.slice(offset, offset + INSERT_CHUNK);
    const chunkIndices = pendingIndices.slice(offset, offset + INSERT_CHUNK);
    try {
      await db.transaction(async (transaction) => {
        const inserted = await transaction
          .insert(bookmarks)
          .values(chunk.map(toRow))
          .returning({ id: bookmarks.id, url: bookmarks.url });
        const insertedByUrl = new Map(
          inserted.map((bookmark) => [bookmark.url, bookmark.id]),
        );

        for (const item of chunk) {
          await replaceBookmarkCategories(
            transaction,
            insertedByUrl.get(item.url)!,
            categoryIdsForItem(item),
            { source: "import", allowDraft: true },
          );
        }
      });
      chunk.forEach((item, chunkIndex) => {
        results[chunkIndices[chunkIndex]] = {
          url: item.url,
          status: "created",
        };
      });
    } catch (error) {
      logger.warn("Bookmark chunk import failed; retrying individually", {
        count: chunk.length,
        error,
      });
      await insertIndividually(chunk, chunkIndices, results);
    }
  }

  return results;
}
