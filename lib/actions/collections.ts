"use server";

import { db } from "@/db/client";
import { collections, collectionBookmarks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateSlug } from "@/lib/utils";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { logger } from "@/lib/logger";
import { invalidate, requireAdmin, type ActionState } from "./_shared";

function parseBookmarkIds(raw: string): number[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("bookmarkIds must be an array");
  return [...new Set(parsed.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
}

export async function createCollection(
  prevState: ActionState | null,
  formData: {
    title: string;
    slug: string;
    description: string;
    content: string;
    coverImage: string;
    status: string;
    bookmarkIds: string;
  },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    let slug = formData.slug;
    if (!slug) slug = generateSlug(formData.title);

    const bookmarkIds = parseBookmarkIds(formData.bookmarkIds);
    const collection = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(collections)
        .values({
          title: formData.title,
          slug,
          description: formData.description || null,
          content: formData.content || null,
          coverImage: formData.coverImage || null,
          status: formData.status || "draft",
          publishedAt: formData.status === "published" ? new Date() : null,
        })
        .returning();

      if (bookmarkIds.length > 0) {
        await tx.insert(collectionBookmarks).values(
          bookmarkIds.map((bookmarkId, index) => ({
            collectionId: created.id,
            bookmarkId,
            sortOrder: index,
          })),
        );
      }
      return created;
    });

    revalidatePath("/hi-studio");
    revalidatePath("/collections");
    invalidate(CACHE_TAGS.collections);
    return { success: true, data: { id: collection.id } };
  } catch (err) {
    logger.error("Error creating collection:", err);
    return { error: "Failed to create collection" };
  }
}

export async function updateCollection(
  prevState: ActionState | null,
  formData: {
    id: string;
    title: string;
    slug: string;
    description: string;
    content: string;
    coverImage: string;
    status: string;
    bookmarkIds: string;
  },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    const collectionId = parseInt(formData.id, 10);
    if (isNaN(collectionId)) return { error: "Invalid collection ID" };

    const bookmarkIds = parseBookmarkIds(formData.bookmarkIds);
    const updated = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select 1 from ${collections} where ${collections.id} = ${collectionId} for update`,
      );
      const [current] = await tx
        .select()
        .from(collections)
        .where(eq(collections.id, collectionId))
        .limit(1);
      if (!current) return false;

      await tx
        .update(collections)
        .set({
          title: formData.title,
          slug: formData.slug,
          description: formData.description || null,
          content: formData.content || null,
          coverImage: formData.coverImage || null,
          status: formData.status || "draft",
          publishedAt:
            formData.status === "published" && current.status !== "published"
              ? new Date()
              : current.publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(collections.id, collectionId));

      await tx
        .delete(collectionBookmarks)
        .where(eq(collectionBookmarks.collectionId, collectionId));

      if (bookmarkIds.length > 0) {
        await tx.insert(collectionBookmarks).values(
          bookmarkIds.map((bookmarkId, index) => ({
            collectionId,
            bookmarkId,
            sortOrder: index,
          })),
        );
      }
      return true;
    });

    if (!updated) return { error: "Collection not found" };

    revalidatePath("/hi-studio");
    revalidatePath("/collections");
    revalidatePath(`/collections/${formData.slug}`);
    invalidate(CACHE_TAGS.collections);
    return { success: true };
  } catch (err) {
    logger.error("Error updating collection:", err);
    return { error: "Failed to update collection" };
  }
}

export async function deleteCollection(
  prevState: ActionState | null,
  formData: { id: string },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    const collectionId = parseInt(formData.id, 10);
    if (isNaN(collectionId)) return { error: "Invalid collection ID" };

    await db.delete(collections).where(eq(collections.id, collectionId));
    revalidatePath("/hi-studio");
    revalidatePath("/collections");
    invalidate(CACHE_TAGS.collections);
    return { success: true };
  } catch (err) {
    logger.error("Error deleting collection:", err);
    return { error: "Failed to delete collection" };
  }
}

export async function getCollectionBookmarkIdsAction(
  collectionId: number,
): Promise<number[]> {
  const authError = await requireAdmin();
  if (authError) return [];
  const { getCollectionBookmarkIds } = await import("@/lib/data");
  return getCollectionBookmarkIds(collectionId);
}

// ============ Translation Actions ============
