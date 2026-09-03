"use server";

import { db } from "@/db/client";
import {
  bookmarkCategories,
  categories,
  submissionCategories,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { logger } from "@/lib/logger";
import { invalidate, requireAdmin, type ActionState } from "./_shared";
import { z } from "zod";

const categoryMutationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2_000),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  color: z.string().trim().max(32),
  icon: z.string().trim().max(80),
  groupKey: z.enum(["ai", "build", "work", "growth", "life", "other"]),
  status: z.enum(["draft", "active", "archived"]),
});

async function categoryHasAssignments(categoryId: number): Promise<boolean> {
  const [bookmarkRows, submissionRows] = await Promise.all([
    db
      .select({ id: bookmarkCategories.bookmarkId })
      .from(bookmarkCategories)
      .where(eq(bookmarkCategories.categoryId, categoryId))
      .limit(1),
    db
      .select({ id: submissionCategories.submissionId })
      .from(submissionCategories)
      .where(eq(submissionCategories.categoryId, categoryId))
      .limit(1),
  ]);
  return bookmarkRows.length > 0 || submissionRows.length > 0;
}

export async function createCategory(
  prevState: ActionState | null,
  formData: {
    name: string;
    description: string;
    slug: string;
    color: string;
    icon: string;
    groupKey: string;
    status: string;
  },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    const parsed = categoryMutationSchema.safeParse(formData);
    if (!parsed.success) return { error: "Invalid category data" };
    const { name, description, slug, color, icon, groupKey, status } = parsed.data;

    // Don't manually set id - let database auto-increment
    await db.insert(categories).values({
      name,
      description,
      slug,
      color,
      icon,
      groupKey,
      status,
    });

    revalidatePath("/hi-studio");
    revalidatePath("/");
    invalidate(CACHE_TAGS.categories, CACHE_TAGS.bookmarks);
    return { success: true };
  } catch (err) {
    logger.error("Error creating category:", err);
    return { error: "Failed to create category" };
  }
}

export async function updateCategory(
  prevState: ActionState | null,
  formData: {
    id: string;
    name: string;
    description: string;
    slug: string;
    color: string;
    icon: string;
    groupKey: string;
    status: string;
  },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    if (!formData) {
      return { error: "No form data provided" };
    }

    const id = formData.id;
    if (!id) {
      return { error: "No category ID provided" };
    }

    // Convert id to number for database
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return { error: "Invalid category ID" };
    }

    const parsed = categoryMutationSchema.safeParse(formData);
    if (!parsed.success) return { error: "Invalid category data" };
    const { name, description, slug, color, icon, groupKey, status } = parsed.data;

    const [currentCategory] = await db
      .select({ slug: categories.slug, status: categories.status })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);
    if (!currentCategory) return { error: "Category not found" };
    const wouldBreakAssignedCategory =
      slug !== currentCategory.slug ||
      status === "archived" ||
      (currentCategory.status === "active" && status !== "active");
    if (
      wouldBreakAssignedCategory &&
      (await categoryHasAssignments(categoryId))
    ) {
      return {
        error:
          "Reassign existing bookmarks and submissions before changing this category slug or making it non-active",
      };
    }

    await db
      .update(categories)
      .set({
        name,
        description,
        slug,
        color,
        icon,
        groupKey,
        status,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, categoryId));

    revalidatePath("/hi-studio");
    revalidatePath("/");
    invalidate(CACHE_TAGS.categories, CACHE_TAGS.bookmarks);

    return { success: true };
  } catch (err) {
    logger.error("Error updating category:", err);
    return { error: "Failed to update category" };
  }
}

export async function deleteCategory(
  prevState: ActionState | null,
  formData: {
    id: string;
  },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    if (!formData) {
      return { error: "No form data provided" };
    }

    const id = formData.id;
    if (!id) {
      return { error: "No category ID provided" };
    }

    // Convert id to number for database
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      return { error: "Invalid category ID" };
    }

    if (await categoryHasAssignments(categoryId)) {
      return {
        error:
          "Reassign existing bookmarks and submissions before archiving this category",
      };
    }

    // Category URLs and historical assignments must remain stable. Archiving
    // removes the category from public navigation without destroying links.
    await db
      .update(categories)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(categories.id, categoryId));

    revalidatePath("/hi-studio");
    revalidatePath("/");
    invalidate(CACHE_TAGS.categories, CACHE_TAGS.bookmarks);

    return { success: true, message: "Category archived" };
  } catch (err) {
    logger.error("Error deleting category:", err);
    return { error: "Failed to delete category" };
  }
}

export async function updateCategoriesOrder(
  prevState: ActionState | null,
  formData: {
    categories: Array<{ id: number; sortOrder: number }>;
  },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    if (!formData || !formData.categories) {
      return { error: "No categories data provided" };
    }

    // Batch update category sort order in parallel (independent rows).
    await Promise.all(
      formData.categories.map((category) =>
        db
          .update(categories)
          .set({ sortOrder: category.sortOrder })
          .where(eq(categories.id, category.id)),
      ),
    );

    revalidatePath("/hi-studio");
    revalidatePath("/");
    revalidatePath("/c");
    // Bookmarks are sorted via their category; reordering categories changes
    // the visible bookmark grouping, so bust the bookmarks tag too.
    invalidate(CACHE_TAGS.categories, CACHE_TAGS.bookmarks);

    return { success: true, message: "Categories order updated successfully" };
  } catch (err) {
    logger.error("Error updating categories order:", err);
    return { error: "Failed to update categories order" };
  }
}

// Bookmark Actions
