"use server";

import { db } from "@/db/client";
import { tags, bookmarkTags, bookmarks } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateSlug } from "@/lib/utils";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { logger } from "@/lib/logger";
import { invalidate, requireAdmin, type ActionState } from "./_shared";

export async function createTag(
  prevState: ActionState | null,
  formData: { name: string; slug: string; color: string; icon: string },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    let slug = formData.slug;
    if (!slug) slug = generateSlug(formData.name);

    await db.insert(tags).values({
      name: formData.name,
      slug,
      color: formData.color || null,
      icon: formData.icon || null,
    });

    revalidatePath("/hi-studio");
    revalidatePath("/tags");
    invalidate(CACHE_TAGS.tags);
    return { success: true };
  } catch (err) {
    logger.error("Error creating tag:", err);
    return { error: "Failed to create tag" };
  }
}

export async function updateTag(
  prevState: ActionState | null,
  formData: { id: string; name: string; slug: string; color: string; icon: string },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    const tagId = parseInt(formData.id, 10);
    if (isNaN(tagId)) return { error: "Invalid tag ID" };

    await db
      .update(tags)
      .set({
        name: formData.name,
        slug: formData.slug,
        color: formData.color || null,
        icon: formData.icon || null,
        updatedAt: new Date(),
      })
      .where(eq(tags.id, tagId));

    revalidatePath("/hi-studio");
    revalidatePath("/tags");
    invalidate(CACHE_TAGS.tags);
    return { success: true };
  } catch (err) {
    logger.error("Error updating tag:", err);
    return { error: "Failed to update tag" };
  }
}

export async function deleteTag(
  prevState: ActionState | null,
  formData: { id: string },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    const tagId = parseInt(formData.id, 10);
    if (isNaN(tagId)) return { error: "Invalid tag ID" };

    await db.delete(tags).where(eq(tags.id, tagId));
    revalidatePath("/hi-studio");
    revalidatePath("/tags");
    invalidate(CACHE_TAGS.tags, CACHE_TAGS.bookmarks);
    return { success: true };
  } catch (err) {
    logger.error("Error deleting tag:", err);
    return { error: "Failed to delete tag" };
  }
}

export async function setBookmarkTags(
  prevState: ActionState | null,
  formData: { bookmarkId: string; tagIds: string },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    const bookmarkId = parseInt(formData.bookmarkId, 10);
    if (isNaN(bookmarkId)) return { error: "Invalid bookmark ID" };

    const rawTagIds: unknown = formData.tagIds ? JSON.parse(formData.tagIds) : [];
    if (!Array.isArray(rawTagIds)) return { error: "Invalid tag IDs" };
    const tagIds = [...new Set(
      rawTagIds.map(Number).filter((id) => Number.isInteger(id) && id > 0),
    )];

    const updated = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select 1 from ${bookmarks} where ${bookmarks.id} = ${bookmarkId} for update`,
      );
      const [bookmark] = await tx
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(eq(bookmarks.id, bookmarkId))
        .limit(1);
      if (!bookmark) return false;

      await tx.delete(bookmarkTags).where(eq(bookmarkTags.bookmarkId, bookmarkId));
      if (tagIds.length > 0) {
        await tx.insert(bookmarkTags).values(
          tagIds.map((tagId) => ({ bookmarkId, tagId })),
        );
      }
      return true;
    });

    if (!updated) return { error: "Bookmark not found" };

    revalidatePath("/hi-studio");
    invalidate(CACHE_TAGS.bookmarks, CACHE_TAGS.tags);
    return { success: true };
  } catch (err) {
    logger.error("Error setting bookmark tags:", err);
    return { error: "Failed to set bookmark tags" };
  }
}

export async function mergeTags(
  prevState: ActionState | null,
  formData: { sourceTagId: string; targetTagId: string },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    const sourceId = parseInt(formData.sourceTagId, 10);
    const targetId = parseInt(formData.targetTagId, 10);
    if (isNaN(sourceId) || isNaN(targetId)) return { error: "Invalid tag IDs" };

    if (sourceId === targetId) return { error: "Source and target tags must differ" };

    const mergedCount = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select 1 from ${tags} where ${tags.id} in (${sourceId}, ${targetId}) order by ${tags.id} for update`,
      );
      const existingTags = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(inArray(tags.id, [sourceId, targetId]));
      if (existingTags.length !== 2) return null;

      const sourceBookmarks = await tx
        .select({ bookmarkId: bookmarkTags.bookmarkId })
        .from(bookmarkTags)
        .where(eq(bookmarkTags.tagId, sourceId));

      if (sourceBookmarks.length > 0) {
        await tx
          .insert(bookmarkTags)
          .values(
            sourceBookmarks.map(({ bookmarkId }) => ({ bookmarkId, tagId: targetId })),
          )
          .onConflictDoNothing();
      }

      await tx.delete(tags).where(eq(tags.id, sourceId));
      return sourceBookmarks.length;
    });

    if (mergedCount === null) return { error: "Source or target tag not found" };

    revalidatePath("/hi-studio");
    revalidatePath("/tags");
    invalidate(CACHE_TAGS.tags, CACHE_TAGS.bookmarks);
    return { success: true, message: `Merged ${mergedCount} bookmarks into target tag` };
  } catch (err) {
    logger.error("Error merging tags:", err);
    return { error: "Failed to merge tags" };
  }
}

// ============ Collection Actions ============
