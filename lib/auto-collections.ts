import { createHash } from "node:crypto";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  bookmarks,
  categories,
  collectionBookmarks,
  collectionGenerationRuns,
  collections,
} from "@/db/schema";
import {
  AUTO_COLLECTION_MAX_EXISTING_THEMES,
  AUTO_COLLECTION_MIN_BOOKMARKS,
  normalizeAutoCollectionCandidates,
  type AutoCollectionSourceBookmark,
  type ExistingAutoCollection,
} from "@/lib/auto-collection-candidates";
import { generateCollections, isAIConfigured } from "@/lib/ai-config";
import { logger } from "@/lib/logger";
import { publicBookmarkCondition } from "@/lib/public-bookmark";

const DEFAULT_SOURCE_LIMIT = 250;
const MAX_SOURCE_LIMIT = 500;
const MAX_SOURCE_PROMPT_CHARACTERS = 40_000;
const STALE_RUN_MS = 15 * 60 * 1000;

export type AutoCollectionGenerationSource = "admin" | "cron";

export type AutoCollectionGenerator = (params: {
  bookmarks: AutoCollectionSourceBookmark[];
  existingCollections: ExistingAutoCollection[];
}) => Promise<unknown[]>;

export type AutoCollectionCreated = {
  id: number;
  title: string;
  slug: string;
  bookmarkCount: number;
};

export type AutoCollectionGenerationResult =
  | { outcome: "not_configured" }
  | { outcome: "insufficient_source"; sourceBookmarkCount: number }
  | {
      outcome: "unchanged";
      runId: number;
      sourceBookmarkCount: number;
    }
  | {
      outcome: "in_progress";
      runId: number | null;
      sourceBookmarkCount: number;
    }
  | {
      outcome: "completed";
      runId: number;
      sourceBookmarkCount: number;
      sourceWasLimited: boolean;
      generated: number;
      created: AutoCollectionCreated[];
      skipped: number;
    }
  | { outcome: "failed"; runId: number | null };

export type AutoCollectionRunSummary = {
  id: number;
  source: AutoCollectionGenerationSource | string;
  status: string;
  sourceBookmarkCount: number;
  generatedCount: number;
  createdCount: number;
  skippedCount: number;
  attemptCount: number;
  startedAt: string;
  finishedAt: string | null;
};

export function getAutoCollectionSourceLimit(): number {
  const requested = Number(process.env.AUTO_COLLECTIONS_SOURCE_LIMIT);
  if (
    !Number.isInteger(requested) ||
    requested < AUTO_COLLECTION_MIN_BOOKMARKS
  ) {
    return DEFAULT_SOURCE_LIMIT;
  }
  return Math.min(requested, MAX_SOURCE_LIMIT);
}

export function getAutoCollectionSourceFingerprint(
  bookmarksForFingerprint: Iterable<{ id: number; updatedAt: Date }>,
  publishedCollectionTitles: Iterable<string> = [],
): string {
  const bookmarkSnapshot = Array.from(bookmarksForFingerprint)
    .map((bookmark): [number, string] => [
      bookmark.id,
      bookmark.updatedAt.toISOString(),
    ])
    .sort(([leftId], [rightId]) => leftId - rightId);
  const collectionSnapshot = Array.from(publishedCollectionTitles)
    .map((title) => title.normalize("NFKC").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .sort();

  return createHash("sha256")
    .update(
      JSON.stringify({
        bookmarks: bookmarkSnapshot,
        publishedCollectionTitles: collectionSnapshot,
      }),
    )
    .digest("hex");
}

function compactSourceText(value: string | null, maxLength: number): string {
  const normalized = value?.replace(/\s+/g, " ").trim() || "";
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}…`
    : normalized;
}

function compactSourceJson(value: unknown, maxLength: number): string {
  try {
    return compactSourceText(JSON.stringify(value) || "", maxLength);
  } catch {
    return "";
  }
}

function toPromptSafeSourceBookmark(bookmark: {
  id: number;
  title: string;
  description: string | null;
  tags: string | null;
  categoryName: string | null;
  keyFeatures: unknown;
  useCases: unknown;
  pricingType: string;
}): AutoCollectionSourceBookmark {
  return {
    id: bookmark.id,
    title: compactSourceText(bookmark.title, 120),
    description: compactSourceText(bookmark.description, 260),
    tags: compactSourceText(bookmark.tags, 100),
    categoryName: compactSourceText(bookmark.categoryName, 64),
    keyFeatures: compactSourceJson(bookmark.keyFeatures, 180),
    useCases: compactSourceJson(bookmark.useCases, 140),
    pricingType: compactSourceText(bookmark.pricingType, 40),
  };
}

async function getGenerationSource() {
  const sourceLimit = getAutoCollectionSourceLimit();
  const sourceRows = await db
    .select({
      id: bookmarks.id,
      title: bookmarks.title,
      description: bookmarks.description,
      tags: bookmarks.tags,
      categoryName: categories.name,
      keyFeatures: bookmarks.keyFeatures,
      useCases: bookmarks.useCases,
      pricingType: bookmarks.pricingType,
      ogImage: bookmarks.ogImage,
      updatedAt: bookmarks.updatedAt,
    })
    .from(bookmarks)
    .leftJoin(categories, eq(bookmarks.categoryId, categories.id))
    .where(publicBookmarkCondition())
    .orderBy(desc(bookmarks.updatedAt), desc(bookmarks.id))
    .limit(sourceLimit + 1);

  const sourceWasLimitedByCount = sourceRows.length > sourceLimit;
  const limitedRows = sourceRows.slice(0, sourceLimit);
  const promptRows: Array<{
    row: (typeof limitedRows)[number];
    bookmark: AutoCollectionSourceBookmark;
  }> = [];
  let promptCharacters = 0;

  for (const row of limitedRows) {
    const bookmark = toPromptSafeSourceBookmark(row);
    const serializedLength = JSON.stringify(bookmark).length;
    if (
      promptRows.length > 0 &&
      promptCharacters + serializedLength > MAX_SOURCE_PROMPT_CHARACTERS
    ) {
      break;
    }
    promptRows.push({ row, bookmark });
    promptCharacters += serializedLength;
  }

  return {
    sourceWasLimited:
      sourceWasLimitedByCount || promptRows.length < limitedRows.length,
    bookmarks: promptRows.map(({ bookmark }) => bookmark),
    fingerprintRows: promptRows.map(({ row: { id, updatedAt } }) => ({
      id,
      updatedAt,
    })),
    ogImageByBookmarkId: new Map(
      promptRows.map(({ row }) => [row.id, row.ogImage]),
    ),
  };
}

async function getPublishedCollectionsForGeneration(): Promise<
  ExistingAutoCollection[]
> {
  const publishedRows = await db
    .select({ title: collections.title })
    .from(collections)
    .where(eq(collections.status, "published"))
    .orderBy(desc(collections.updatedAt))
    .limit(AUTO_COLLECTION_MAX_EXISTING_THEMES);

  return publishedRows;
}

async function getExistingCollectionTitlesForGeneration(): Promise<string[]> {
  const existingRows = await db
    .select({ title: collections.title })
    .from(collections)
    .orderBy(desc(collections.updatedAt));

  // Unpublished editorial drafts remain local: they participate in the final
  // duplicate-theme check but are never sent to the AI provider.
  return existingRows.map((collection) => collection.title);
}

type ClaimedRun = { kind: "claimed"; id: number };
type ExistingRun =
  | { kind: "unchanged"; id: number }
  | { kind: "in_progress"; id: number | null };

async function claimGenerationRun(input: {
  fingerprint: string;
  source: AutoCollectionGenerationSource;
  requestedBy: string | null;
  sourceBookmarkCount: number;
}): Promise<ClaimedRun | ExistingRun> {
  const now = new Date();
  const [inserted] = await db
    .insert(collectionGenerationRuns)
    .values({
      inputFingerprint: input.fingerprint,
      source: input.source,
      requestedBy: input.requestedBy,
      status: "running",
      sourceBookmarkCount: input.sourceBookmarkCount,
      startedAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: collectionGenerationRuns.inputFingerprint })
    .returning({ id: collectionGenerationRuns.id });
  if (inserted) return { kind: "claimed", id: inserted.id };

  const [existing] = await db
    .select({
      id: collectionGenerationRuns.id,
      status: collectionGenerationRuns.status,
      startedAt: collectionGenerationRuns.startedAt,
    })
    .from(collectionGenerationRuns)
    .where(eq(collectionGenerationRuns.inputFingerprint, input.fingerprint))
    .limit(1);

  // A unique conflict without a readable row is transient. Treat it as work
  // in progress rather than starting a duplicate call to the AI provider.
  if (!existing) return { kind: "in_progress", id: null };
  if (existing.status === "succeeded") {
    return { kind: "unchanged", id: existing.id };
  }

  const retryCutoff = new Date(Date.now() - STALE_RUN_MS);
  const retryable =
    existing.status === "failed" ||
    (existing.status === "running" && existing.startedAt < retryCutoff);
  if (!retryable) return { kind: "in_progress", id: existing.id };

  const [reclaimed] = await db
    .update(collectionGenerationRuns)
    .set({
      source: input.source,
      requestedBy: input.requestedBy,
      status: "running",
      sourceBookmarkCount: input.sourceBookmarkCount,
      generatedCount: 0,
      createdCount: 0,
      skippedCount: 0,
      attemptCount: sql`${collectionGenerationRuns.attemptCount} + 1`,
      error: null,
      startedAt: now,
      finishedAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(collectionGenerationRuns.id, existing.id),
        or(
          eq(collectionGenerationRuns.status, "failed"),
          and(
            eq(collectionGenerationRuns.status, "running"),
            lt(collectionGenerationRuns.startedAt, retryCutoff),
          ),
        ),
      ),
    )
    .returning({ id: collectionGenerationRuns.id });

  return reclaimed
    ? { kind: "claimed", id: reclaimed.id }
    : { kind: "in_progress", id: existing.id };
}

async function createAutoCollectionDraft(input: {
  runId: number;
  candidate: ReturnType<typeof normalizeAutoCollectionCandidates>[number];
  coverImage: string | null;
}): Promise<AutoCollectionCreated | null> {
  return db.transaction(async (tx) => {
    const [collection] = await tx
      .insert(collections)
      .values({
        title: input.candidate.title,
        slug: input.candidate.slug,
        description: input.candidate.description,
        content: input.candidate.content,
        coverImage: input.coverImage,
        status: "draft",
        generationRunId: input.runId,
      })
      .onConflictDoNothing({ target: collections.slug })
      .returning({
        id: collections.id,
        title: collections.title,
        slug: collections.slug,
      });
    if (!collection) return null;

    await tx.insert(collectionBookmarks).values(
      input.candidate.bookmarkIds.map((bookmarkId, sortOrder) => ({
        collectionId: collection.id,
        bookmarkId,
        sortOrder,
        note: input.candidate.notes[String(bookmarkId)] || null,
      })),
    );

    return {
      ...collection,
      bookmarkCount: input.candidate.bookmarkIds.length,
    };
  });
}

export async function runAutoCollectionGeneration(input: {
  source: AutoCollectionGenerationSource;
  requestedBy?: string | null;
  generate?: AutoCollectionGenerator;
}): Promise<AutoCollectionGenerationResult> {
  if (!isAIConfigured()) return { outcome: "not_configured" };

  let runId: number | null = null;
  try {
    const source = await getGenerationSource();
    if (source.bookmarks.length < AUTO_COLLECTION_MIN_BOOKMARKS) {
      return {
        outcome: "insufficient_source",
        sourceBookmarkCount: source.bookmarks.length,
      };
    }

    const publishedCollections = await getPublishedCollectionsForGeneration();
    const claimed = await claimGenerationRun({
      fingerprint: getAutoCollectionSourceFingerprint(
        source.fingerprintRows,
        publishedCollections.map((collection) => collection.title),
      ),
      source: input.source,
      requestedBy: input.requestedBy ?? null,
      sourceBookmarkCount: source.bookmarks.length,
    });
    if (claimed.kind === "unchanged") {
      return {
        outcome: "unchanged",
        runId: claimed.id,
        sourceBookmarkCount: source.bookmarks.length,
      };
    }
    if (claimed.kind === "in_progress") {
      return {
        outcome: "in_progress",
        runId: claimed.id,
        sourceBookmarkCount: source.bookmarks.length,
      };
    }

    runId = claimed.id;
    const existingTitles = await getExistingCollectionTitlesForGeneration();
    const generate = input.generate ?? generateCollections;
    const rawCandidates = await generate({
      bookmarks: source.bookmarks,
      existingCollections: publishedCollections,
    });
    const candidates = normalizeAutoCollectionCandidates(rawCandidates, {
      validBookmarkIds: source.bookmarks.map((bookmark) => bookmark.id),
      existingTitles,
    });
    const created: AutoCollectionCreated[] = [];
    for (const candidate of candidates) {
      const collection = await createAutoCollectionDraft({
        runId,
        candidate,
        coverImage:
          source.ogImageByBookmarkId.get(candidate.coverBookmarkId) ?? null,
      });
      if (collection) created.push(collection);
    }

    const now = new Date();
    await db
      .update(collectionGenerationRuns)
      .set({
        status: "succeeded",
        generatedCount: candidates.length,
        createdCount: created.length,
        skippedCount: candidates.length - created.length,
        finishedAt: now,
        updatedAt: now,
      })
      .where(eq(collectionGenerationRuns.id, runId));

    return {
      outcome: "completed",
      runId,
      sourceBookmarkCount: source.bookmarks.length,
      sourceWasLimited: source.sourceWasLimited,
      generated: candidates.length,
      created,
      skipped: candidates.length - created.length,
    };
  } catch (error) {
    logger.error("[auto-collections] generation failed:", error);
    if (runId !== null) {
      const now = new Date();
      await db
        .update(collectionGenerationRuns)
        .set({
          status: "failed",
          error: "Generation failed; see application logs.",
          finishedAt: now,
          updatedAt: now,
        })
        .where(eq(collectionGenerationRuns.id, runId))
        .catch((updateError) =>
          logger.error(
            "[auto-collections] could not mark failed run:",
            updateError,
          ),
        );
    }
    return { outcome: "failed", runId };
  }
}

export async function getLatestAutoCollectionRun(): Promise<AutoCollectionRunSummary | null> {
  if (!process.env.DATABASE_URL) return null;

  const [run] = await db
    .select({
      id: collectionGenerationRuns.id,
      source: collectionGenerationRuns.source,
      status: collectionGenerationRuns.status,
      sourceBookmarkCount: collectionGenerationRuns.sourceBookmarkCount,
      generatedCount: collectionGenerationRuns.generatedCount,
      createdCount: collectionGenerationRuns.createdCount,
      skippedCount: collectionGenerationRuns.skippedCount,
      attemptCount: collectionGenerationRuns.attemptCount,
      startedAt: collectionGenerationRuns.startedAt,
      finishedAt: collectionGenerationRuns.finishedAt,
    })
    .from(collectionGenerationRuns)
    .orderBy(
      desc(collectionGenerationRuns.startedAt),
      desc(collectionGenerationRuns.id),
    )
    .limit(1);

  if (!run) return null;
  return {
    ...run,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
  };
}
