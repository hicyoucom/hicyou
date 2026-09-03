"use server";

import { db } from "@/db/client";
import { bookmarks, categories, collections, translations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { defaultLocale, locales } from "@/i18n/config";
import {
  batchTranslateInternal,
  type BatchTranslateInput,
} from "@/lib/batch-translate";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { logger } from "@/lib/logger";
import {
  isTranslationFieldKey,
  translationEntityTypes,
  type TranslationEntityType,
} from "@/lib/translation-fields";
import { invalidate, requireAdmin, type ActionState } from "./_shared";

const upsertTranslationSchema = z
  .object({
    entityType: z.enum(translationEntityTypes),
    entityId: z.coerce.number().int().positive(),
    locale: z.enum(locales).refine((locale) => locale !== defaultLocale),
    field: z.string().min(1).max(120),
    value: z
      .string()
      .max(50_000)
      .refine((value) => value.trim().length > 0),
  })
  .superRefine((input, context) => {
    if (!isTranslationFieldKey(input.entityType, input.field)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["field"],
        message: "Field is not translatable for this entity",
      });
    }
  });

async function translationEntityExists(
  entityType: TranslationEntityType,
  entityId: number,
): Promise<boolean> {
  if (entityType === "bookmark") {
    return (
      (
        await db
          .select({ id: bookmarks.id })
          .from(bookmarks)
          .where(eq(bookmarks.id, entityId))
          .limit(1)
      ).length > 0
    );
  }
  if (entityType === "category") {
    return (
      (
        await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.id, entityId))
          .limit(1)
      ).length > 0
    );
  }
  return (
    (
      await db
        .select({ id: collections.id })
        .from(collections)
        .where(eq(collections.id, entityId))
        .limit(1)
    ).length > 0
  );
}

export async function upsertTranslation(
  prevState: ActionState | null,
  formData: {
    entityType: string;
    entityId: string;
    locale: string;
    field: string;
    value: string;
  },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    const parsed = upsertTranslationSchema.safeParse(formData);
    if (!parsed.success) return { error: "Invalid translation parameters" };
    const input = parsed.data;
    if (!(await translationEntityExists(input.entityType, input.entityId))) {
      return { error: "Translation entity not found" };
    }

    await db
      .insert(translations)
      .values({
        entityType: input.entityType,
        entityId: input.entityId,
        locale: input.locale,
        field: input.field,
        value: input.value,
      })
      .onConflictDoUpdate({
        target: [
          translations.entityType,
          translations.entityId,
          translations.locale,
          translations.field,
        ],
        set: { value: input.value, updatedAt: new Date() },
      });

    invalidate(CACHE_TAGS.translations);
    revalidatePath(`/${input.locale}`, "layout");
    return { success: true };
  } catch (error) {
    logger.error("Error upserting translation:", error);
    return { error: "Failed to save translation" };
  }
}

export async function batchTranslate(
  prevState: ActionState | null,
  formData: BatchTranslateInput,
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const result = await batchTranslateInternal(formData);
  if ((result.data?.succeeded ?? 0) > 0) {
    invalidate(CACHE_TAGS.translations);
    revalidatePath(`/${formData.locale}`, "layout");
  }
  return result;
}
