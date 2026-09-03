import { db } from "@/db/client";
import { bookmarks, categories, collections, translations } from "@/db/schema";
import { defaultLocale, locales } from "@/i18n/config";
import { inArray, sql } from "drizzle-orm";
import { z } from "zod";

import type { ActionState } from "@/lib/actions/_shared";
import { logger } from "@/lib/logger";
import { translateTexts } from "@/lib/translate";
import {
  buildTranslationTexts,
  translationEntityName,
  translationEntityTypes,
  translationFields,
  type TranslationEntity,
  type TranslationEntityType,
} from "@/lib/translation-fields";

const TRANSLATION_BATCH_SIZE = 10;
const MAX_ENTITY_COUNT = 100;

function parseJsonArray(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

const batchTranslateInputSchema = z
  .object({
    entityType: z.enum(translationEntityTypes),
    entityIds: z.preprocess(
      parseJsonArray,
      z.array(z.number().int().positive()).min(1).max(MAX_ENTITY_COUNT),
    ),
    locale: z.enum(locales).refine((locale) => locale !== defaultLocale),
    fields: z.preprocess(parseJsonArray, z.array(z.string()).min(1).max(10)),
  })
  .superRefine((input, context) => {
    const allowed = new Set(translationFields[input.entityType]);
    input.fields.forEach((field, index) => {
      if (!allowed.has(field)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fields", index],
          message: `Field is not translatable for ${input.entityType}`,
        });
      }
    });
  })
  .transform((input) => ({
    ...input,
    entityIds: [...new Set(input.entityIds)],
    fields: [...new Set(input.fields)],
  }));

export type BatchTranslateInput = {
  entityType: string;
  entityIds: string | number[];
  locale: string;
  fields: string | string[];
};

export type NormalizedBatchTranslateInput = z.infer<
  typeof batchTranslateInputSchema
>;

export type BatchTranslationFailure = {
  entityId: number;
  entityName: string;
  error: string;
};

export type BatchTranslationResult = {
  requested: number;
  found: number;
  succeeded: number;
  failed: number;
  skipped: number;
  cancelled: boolean;
  failures: BatchTranslationFailure[];
};

export type BatchTranslationProgress = {
  message: string;
  index: number;
  total: number;
  status: "info" | "translating" | "success" | "error";
};

type BatchTranslationDependencies = {
  loadEntities?: (
    entityType: TranslationEntityType,
    entityIds: number[],
  ) => Promise<TranslationEntity[]>;
  translate?: (
    texts: Record<string, string>,
    locale: string,
    options: { signal?: AbortSignal },
  ) => Promise<Record<string, string>>;
  persist?: (
    entityType: TranslationEntityType,
    entityId: number,
    locale: string,
    fields: Record<string, string>,
  ) => Promise<void>;
};

export type BatchTranslationOptions = BatchTranslationDependencies & {
  signal?: AbortSignal;
  onProgress?: (progress: BatchTranslationProgress) => void | Promise<void>;
};

export function parseBatchTranslateInput(
  input: BatchTranslateInput,
): NormalizedBatchTranslateInput {
  return batchTranslateInputSchema.parse(input);
}

async function loadEntities(
  entityType: TranslationEntityType,
  entityIds: number[],
): Promise<TranslationEntity[]> {
  if (entityType === "bookmark") {
    return (
      await db.select().from(bookmarks).where(inArray(bookmarks.id, entityIds))
    ).map((entity) => ({ ...entity }));
  }
  if (entityType === "category") {
    return (
      await db
        .select()
        .from(categories)
        .where(inArray(categories.id, entityIds))
    ).map((entity) => ({ ...entity }));
  }
  return (
    await db
      .select()
      .from(collections)
      .where(inArray(collections.id, entityIds))
  ).map((entity) => ({ ...entity }));
}

async function persistTranslations(
  entityType: TranslationEntityType,
  entityId: number,
  locale: string,
  fields: Record<string, string>,
): Promise<void> {
  const entries = Object.entries(fields);
  if (entries.length === 0) return;

  // One statement is the entity-level commit boundary. If any model batch
  // failed, the caller never reaches this function and no partial rows land.
  await db
    .insert(translations)
    .values(
      entries.map(([field, value]) => ({
        entityType,
        entityId,
        locale,
        field,
        value,
      })),
    )
    .onConflictDoUpdate({
      target: [
        translations.entityType,
        translations.entityId,
        translations.locale,
        translations.field,
      ],
      set: { value: sql`excluded.value`, updatedAt: new Date() },
    });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function runBatchTranslation(
  input: NormalizedBatchTranslateInput,
  options: BatchTranslationOptions = {},
): Promise<BatchTranslationResult> {
  const load = options.loadEntities ?? loadEntities;
  const translate = options.translate ?? translateTexts;
  const persist = options.persist ?? persistTranslations;
  const entities = await load(input.entityType, input.entityIds);
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const orderedEntities = input.entityIds.flatMap((id) => {
    const entity = entityById.get(id);
    return entity ? [entity] : [];
  });
  const failures: BatchTranslationFailure[] = input.entityIds
    .filter((id) => !entityById.has(id))
    .map((entityId) => ({
      entityId,
      entityName: `${input.entityType} #${entityId}`,
      error: "Entity not found",
    }));
  let succeeded = 0;
  let skipped = 0;
  let cancelled = false;

  await options.onProgress?.({
    message: `Starting translation of ${orderedEntities.length} ${input.entityType}(s) to ${input.locale}`,
    index: 0,
    total: orderedEntities.length,
    status: "info",
  });

  for (let index = 0; index < orderedEntities.length; index += 1) {
    if (options.signal?.aborted) {
      cancelled = true;
      break;
    }

    const entity = orderedEntities[index];
    const entityName = translationEntityName(input.entityType, entity);
    const position = index + 1;
    await options.onProgress?.({
      message: `[${position}/${orderedEntities.length}] Translating: ${entityName}`,
      index: position,
      total: orderedEntities.length,
      status: "translating",
    });

    const texts = buildTranslationTexts(input.entityType, entity, input.fields);
    const entries = Object.entries(texts);
    if (entries.length === 0) {
      skipped += 1;
      await options.onProgress?.({
        message: `[${position}/${orderedEntities.length}] Skipped (no content): ${entityName}`,
        index: position,
        total: orderedEntities.length,
        status: "info",
      });
      continue;
    }

    try {
      const translatedFields: Record<string, string> = {};
      const batchCount = Math.ceil(entries.length / TRANSLATION_BATCH_SIZE);
      for (
        let offset = 0;
        offset < entries.length;
        offset += TRANSLATION_BATCH_SIZE
      ) {
        if (options.signal?.aborted) {
          cancelled = true;
          break;
        }
        const batchNumber = Math.floor(offset / TRANSLATION_BATCH_SIZE) + 1;
        const batchEntries = entries.slice(
          offset,
          offset + TRANSLATION_BATCH_SIZE,
        );
        if (batchCount > 1) {
          await options.onProgress?.({
            message: `[${position}/${orderedEntities.length}] Translating batch ${batchNumber}/${batchCount} (${batchEntries.length} fields)`,
            index: position,
            total: orderedEntities.length,
            status: "translating",
          });
        }
        const translated = await translate(
          Object.fromEntries(batchEntries),
          input.locale,
          { signal: options.signal },
        );
        Object.assign(translatedFields, translated);
      }

      if (cancelled) break;
      await persist(
        input.entityType,
        entity.id,
        input.locale,
        translatedFields,
      );
      succeeded += 1;
      await options.onProgress?.({
        message: `[${position}/${orderedEntities.length}] ✓ ${entityName}`,
        index: position,
        total: orderedEntities.length,
        status: "success",
      });
    } catch (error) {
      if (options.signal?.aborted) {
        cancelled = true;
        break;
      }
      const failure = {
        entityId: entity.id,
        entityName,
        error: errorMessage(error),
      };
      failures.push(failure);
      logger.error("Translation entity failed", {
        entityType: input.entityType,
        entityId: entity.id,
        locale: input.locale,
        error,
      });
      await options.onProgress?.({
        message: `[${position}/${orderedEntities.length}] ✗ ${entityName}: ${failure.error}`,
        index: position,
        total: orderedEntities.length,
        status: "error",
      });
    }
  }

  return {
    requested: input.entityIds.length,
    found: orderedEntities.length,
    succeeded,
    failed: failures.length,
    skipped,
    cancelled,
    failures,
  };
}

/** Adapter retained for existing admin Server Action callers. */
export async function batchTranslateInternal(
  formData: BatchTranslateInput,
): Promise<ActionState<BatchTranslationResult>> {
  try {
    const input = parseBatchTranslateInput(formData);
    const result = await runBatchTranslation(input);
    const success = result.failed === 0 && !result.cancelled;
    return {
      success,
      ...(success
        ? {}
        : {
            error: result.cancelled
              ? "Translation cancelled"
              : `${result.failed} entities failed to translate`,
          }),
      message: `Translated ${result.succeeded} of ${result.requested} entities to ${input.locale}`,
      data: result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Invalid batch translation parameters" };
    }
    logger.error("Error in batch translate", error);
    return { error: "Failed to batch translate" };
  }
}
