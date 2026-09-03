"use server";

import { db } from "@/db/client";
import { bookmarks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateSlug } from "@/lib/utils";
import { fetchSiteMetadata } from "@/lib/fetch-metadata";
import { isAIConfigured, generateWebsiteContent } from "@/lib/ai-config";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { MAX_BOOKMARK_TITLE_LENGTH } from "@/lib/bookmark-limits";
import { logger } from "@/lib/logger";
import { invalidate, requireAdmin, type ActionState } from "./_shared";
import type { Faq, KeyFeature } from "@/db/schema";
import {
  normalizeCategorySelection,
  replaceBookmarkCategories,
} from "@/lib/category-assignments";
import { normalizeHttpUrl, UrlValidationError } from "@/lib/url-validator";
import { fetchWebsiteContext } from "@/lib/website-context";

const DEFAULT_BULK_IMPORT_LIMIT = 50;
const MAX_BULK_IMPORT_LIMIT = 200;

function bulkImportLimit(): number {
  const parsed = Number(
    process.env.AI_BULK_IMPORT_LIMIT ?? DEFAULT_BULK_IMPORT_LIMIT,
  );
  return Number.isInteger(parsed) &&
    parsed > 0 &&
    parsed <= MAX_BULK_IMPORT_LIMIT
    ? parsed
    : DEFAULT_BULK_IMPORT_LIMIT;
}

type BookmarkData = {
  title: string;
  description: string;
  url: string;
  overview: string;
  whyStartups?: string | null;
  alternatives?: string | null;

  search_results: string;
  favicon: string;
  ogImage: string;
  slug: string;
  categoryId: number | null;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  keyFeatures?: KeyFeature[] | null;
  useCases?: string[] | null;
  faqs?: Faq[] | null;
};

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

type GeneratedContent = {
  title: string;
  description: string;
  url: string;
  overview: string;
  search_results: string;
  favicon: string;
  ogImage: string;
  slug: string;
  keyFeatures?: string[];
  useCases?: string[];
  faqs?: { question: string; answer: string }[];
  error?: string;
};

function failedGeneratedContent(url: string, error: string): GeneratedContent {
  return {
    title: "",
    description: "",
    url,
    overview: "",
    search_results: "",
    favicon: "",
    ogImage: "",
    slug: "",
    error,
  };
}

export async function createBookmark(
  prevState: ActionState | null,
  formData: {
    title: string;
    description: string;
    url: string;
    slug: string;
    overview: string;
    whyStartups: string;
    alternatives: string;

    favicon: string;
    ogImage: string;
    search_results: string;
    categoryId: string;
    categoryIds?: string[];
    isFavorite: string;
    isArchived: string;
    isDofollow: string;
    keyFeatures?: string;
    useCases?: string;
    faqs?: string;
  },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    const title = formData.title;
    if (title && title.length > MAX_BOOKMARK_TITLE_LENGTH) {
      return {
        error: `Title is too long (max ${MAX_BOOKMARK_TITLE_LENGTH} characters)`,
      };
    }
    const description = formData.description;
    let url: string;
    try {
      url = normalizeHttpUrl(formData.url);
    } catch (error) {
      return {
        error:
          error instanceof UrlValidationError ? error.message : "Invalid URL",
      };
    }
    let slug = formData.slug;
    const overview = formData.overview;
    const whyStartups = formData.whyStartups || null;
    const alternatives = formData.alternatives || null;

    const favicon = formData.favicon;
    const ogImage = formData.ogImage;
    const search_results = formData.search_results;
    const categoryId = formData.categoryId;
    const isFavorite = formData.isFavorite === "true";
    const isArchived = formData.isArchived === "true";
    const isDofollow = formData.isDofollow === "true";
    const keyFeatures = formData.keyFeatures
      ? JSON.parse(formData.keyFeatures as string)
      : [];
    const useCases = formData.useCases
      ? JSON.parse(formData.useCases as string)
      : [];
    const faqs = formData.faqs ? JSON.parse(formData.faqs as string) : [];

    // Generate slug if not provided
    if (!slug) {
      slug = generateSlug(title);
    }

    const parsedCategoryIds = normalizeCategorySelection(
      categoryId === "none" ? null : parseInt(categoryId, 10),
      (formData.categoryIds ?? []).map((id) => parseInt(id, 10)),
    );

    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(bookmarks)
        .values({
          title,
          slug,
          url,
          description,
          overview,
          whyStartups,
          alternatives,

          categoryId: parsedCategoryIds[0] ?? null,
          search_results: search_results || null,
          isFavorite,
          isArchived,
          isDofollow,
          favicon,
          ogImage,
          keyFeatures,
          useCases,
          faqs,
        })
        .returning({ id: bookmarks.id });
      await replaceBookmarkCategories(tx, created.id, parsedCategoryIds, {
        source: "manual",
        allowDraft: true,
      });
    });

    revalidatePath("/hi-studio");
    revalidatePath("/");
    invalidate(CACHE_TAGS.bookmarks);

    return { success: true };
  } catch (err) {
    logger.error("Error creating bookmark:", err);
    return { error: "Failed to create bookmark" };
  }
}

export async function updateBookmark(
  prevState: ActionState | null,
  formData: {
    id: string;
    title: string;
    description: string;
    url: string;
    slug: string;
    overview: string;
    whyStartups: string;
    alternatives: string;

    favicon: string;
    ogImage: string;
    search_results: string;
    categoryId: string;
    categoryIds?: string[];
    isFavorite: string;
    isArchived: string;
    isDofollow: string;
    keyFeatures?: string;
    useCases?: string;
    faqs?: string;
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
      return { error: "No bookmark ID provided" };
    }

    const title = formData.title;
    if (title && title.length > MAX_BOOKMARK_TITLE_LENGTH) {
      return {
        error: `Title is too long (max ${MAX_BOOKMARK_TITLE_LENGTH} characters)`,
      };
    }
    const description = formData.description;
    let url: string;
    try {
      url = normalizeHttpUrl(formData.url);
    } catch (error) {
      return {
        error:
          error instanceof UrlValidationError ? error.message : "Invalid URL",
      };
    }
    let slug = formData.slug;
    const overview = formData.overview;
    const whyStartups = formData.whyStartups || null;
    const alternatives = formData.alternatives || null;

    const favicon = formData.favicon;
    const ogImage = formData.ogImage;
    const search_results = formData.search_results;
    const categoryId = formData.categoryId;
    const isFavorite = formData.isFavorite === "true";
    const isArchived = formData.isArchived === "true";
    const isDofollow = formData.isDofollow === "true";
    const keyFeatures = formData.keyFeatures
      ? JSON.parse(formData.keyFeatures as string)
      : undefined;
    const useCases = formData.useCases
      ? JSON.parse(formData.useCases as string)
      : undefined;
    const faqs = formData.faqs
      ? JSON.parse(formData.faqs as string)
      : undefined;

    // Generate slug if not provided
    if (!slug) {
      slug = generateSlug(title);
    }

    const parsedCategoryIds = normalizeCategorySelection(
      categoryId === "none" ? null : parseInt(categoryId, 10),
      (formData.categoryIds ?? []).map((category) => parseInt(category, 10)),
    );

    await db.transaction(async (tx) => {
      await tx
        .update(bookmarks)
        .set({
          title,
          slug,
          url,
          description,
          overview,
          whyStartups,
          alternatives,

          categoryId: parsedCategoryIds[0] ?? null,
          search_results: search_results || null,
          favicon,
          ogImage,
          isFavorite,
          isArchived,
          isDofollow,
          ...(keyFeatures !== undefined && { keyFeatures }),
          ...(useCases !== undefined && { useCases }),
          ...(faqs !== undefined && { faqs }),
        })
        .where(eq(bookmarks.id, Number(id)));
      await replaceBookmarkCategories(tx, Number(id), parsedCategoryIds, {
        source: "manual",
        allowDraft: true,
      });
    });

    revalidatePath("/hi-studio");
    revalidatePath("/");
    invalidate(CACHE_TAGS.bookmarks);

    return { success: true };
  } catch (err) {
    logger.error("Error updating bookmark:", err);
    return { error: "Failed to update bookmark" };
  }
}

export async function deleteBookmark(
  prevState: ActionState | null,
  formData: {
    id: string;
    url: string;
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
      return { error: "No bookmark ID provided" };
    }

    const url = formData.url;

    const now = new Date();
    const deleted = await db
      .update(bookmarks)
      .set({
        deletedAt: now,
        status: "archived",
        isArchived: true,
        updatedAt: now,
      })
      .where(eq(bookmarks.id, Number(id)))
      .returning({ id: bookmarks.id });

    if (deleted.length === 0) {
      return { error: "Bookmark not found" };
    }

    revalidatePath("/hi-studio");
    revalidatePath("/");
    revalidatePath(`/${encodeURIComponent(url)}`);
    invalidate(CACHE_TAGS.bookmarks);

    return { success: true };
  } catch (err) {
    logger.error("Error deleting bookmark:", err);
    return { error: "Failed to delete bookmark" };
  }
}

// Helper function to handle errors
export async function bulkUploadBookmarks(
  prevState: ActionState | null,
  formData: {
    urls: string;
  },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    const urls = formData.urls;
    if (!urls) {
      return { error: "No URLs provided" };
    }

    const rawUrls = urls
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean);
    const limit = bulkImportLimit();
    if (rawUrls.length > limit) {
      return { error: `A maximum of ${limit} URLs can be imported at once` };
    }

    const normalizedUrls: string[] = [];
    const seen = new Set<string>();
    try {
      for (const rawUrl of rawUrls) {
        const normalized = normalizeHttpUrl(rawUrl);
        if (!seen.has(normalized)) {
          seen.add(normalized);
          normalizedUrls.push(normalized);
        }
      }
    } catch (error) {
      if (error instanceof UrlValidationError) return { error: error.message };
      throw error;
    }
    const urlList = normalizedUrls;
    let successCount = 0;
    let errorCount = 0;

    // Each URL triggers an AI call + external fetch, so process in small
    // concurrent batches: faster than fully sequential, but bounded so we
    // don't hammer upstream APIs / hit rate limits with a large paste.
    const CONCURRENCY = 4;
    for (let i = 0; i < urlList.length; i += CONCURRENCY) {
      const batch = urlList.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (url) => {
          try {
            const content = await generateContentForUrl(url);
            if (content.error) return "error";

            // Auto-fetched metadata: truncate rather than reject so a single
            // pathological upstream title doesn't break a multi-URL bulk run.
            const safeTitle = content.title.slice(0, MAX_BOOKMARK_TITLE_LENGTH);
            const bookmarkData: BookmarkData = {
              title: safeTitle,
              description: content.description,
              url: content.url,
              overview: content.overview,
              search_results: content.search_results,
              favicon: content.favicon,
              ogImage: content.ogImage,
              slug: content.slug,
              categoryId: null,
              isFavorite: false,
              isArchived: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            await db.insert(bookmarks).values(bookmarkData);
            return "success";
          } catch (error) {
            logger.error(`Error processing URL ${url}:`, error);
            return "error";
          }
        }),
      );
      successCount += results.filter((r) => r === "success").length;
      errorCount += results.filter((r) => r === "error").length;
    }

    if (successCount > 0) {
      revalidatePath("/hi-studio");
      revalidatePath("/");
      invalidate(CACHE_TAGS.bookmarks);
    }

    return {
      success: true,
      message: `Successfully imported ${successCount} bookmarks. ${errorCount > 0 ? `Failed to import ${errorCount} URLs.` : ""}`,
      progress: {
        current: urlList.length,
        total: urlList.length,
      },
    };
  } catch (error) {
    logger.error("Error in bulk upload:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to process bulk upload",
    };
  }
}

// URL Scraping Action
export type ScrapedUrlData = {
  title: string;
  description: string;
  favicon: string;
  ogImage: string;
  url: string;
  search_results: string;
};

export async function scrapeUrl(
  prevState: ActionState | null,
  formData: {
    url: string;
  },
): Promise<ActionState<ScrapedUrlData>> {
  const authError = await requireAdmin();
  if (authError) return { error: authError.error };
  try {
    const url = formData.url;
    if (!url) return { error: "URL is required" };

    const metadata = await fetchSiteMetadata(url);

    if (!process.env.EXASEARCH_API_KEY) {
      return {
        success: true,
        data: {
          title: metadata.title || "",
          description: metadata.description || "",
          favicon: metadata.favicon || "",
          ogImage: metadata.ogImage || "",
          url: metadata.url || url,
          search_results: "",
        },
      };
    }

    const exaResponse = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EXASEARCH_API_KEY}`,
      },
      body: JSON.stringify({
        query: url,
        num_results: 5,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!exaResponse.ok) {
      throw new Error("Failed to fetch search results from Exa");
    }

    const searchResults = await exaResponse.json();

    return {
      success: true,
      data: {
        title: metadata.title || "",
        description: metadata.description || "",
        favicon: metadata.favicon || "",
        ogImage: metadata.ogImage || "",
        url: metadata.url || url,
        search_results: JSON.stringify(searchResults),
      },
    };
  } catch (error) {
    logger.error("Error scraping URL:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to scrape URL",
    };
  }
}

async function generateContentForUrl(url: string): Promise<GeneratedContent> {
  try {
    if (!url) {
      throw new Error("URL is required");
    }

    // Fetch lightweight metadata and optional long-form context concurrently.
    const [metadata, searchResultsStr] = await Promise.all([
      fetchSiteMetadata(url),
      fetchWebsiteContext(url),
    ]);

    // Step 3: Generate tagline and description using AI directly.
    let tagline = "";
    let description = "";
    let keyFeatures: string[] = [];
    let useCases: string[] = [];
    let faqs: { question: string; answer: string }[] = [];

    if (isAIConfigured()) {
      try {
        const content = await generateWebsiteContent({
          url,
          title: metadata.title || "",
          metaDescription: metadata.description,
          searchResults: searchResultsStr,
        });
        tagline = content.tagline || metadata.description || "";
        description = content.description || metadata.description || "";
        keyFeatures = content.keyFeatures || [];
        useCases = content.useCases || [];
        faqs = content.faqs || [];
      } catch (aiError) {
        logger.warn(
          "AI generation failed, using metadata description",
          aiError,
        );
        tagline = metadata.description?.substring(0, 120) || "";
        description = metadata.description || "";
      }
    } else {
      tagline = metadata.description?.substring(0, 120) || "";
      description = metadata.description || "";
    }

    // Generate a slug from the title
    const slug = generateSlug(metadata.title || "");

    return {
      title: metadata.title || "",
      description: tagline, // Tagline goes to description field (for list view)
      url: metadata.url || url,
      overview: description, // Full description goes to overview field (for detail page)
      search_results: searchResultsStr,
      favicon: metadata.favicon || "", // Logo from favicon
      ogImage: metadata.ogImage || "", // Cover from OG image
      slug: slug,
      keyFeatures,
      useCases,
      faqs,
    };
  } catch (error) {
    logger.error("Error generating content:", error);
    return failedGeneratedContent(
      url,
      error instanceof Error ? error.message : "Failed to generate content",
    );
  }
}

export async function generateContent(url: string): Promise<GeneratedContent> {
  const authError = await requireAdmin();
  if (authError) {
    return failedGeneratedContent(url, authError.error || "Unauthorized");
  }
  return generateContentForUrl(url);
}

/**
 * Import bookmarks from JSON data
 */
export async function importBookmarksFromJSON(
  prevState: ActionState | null,
  formData: {
    jsonData: string;
    categoryId: string;
  },
): Promise<ActionState> {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    const { jsonData, categoryId: categoryIdStr } = formData;

    if (!jsonData) {
      return { error: "No JSON data provided" };
    }

    if (!categoryIdStr || categoryIdStr === "none") {
      return { error: "Please select a category" };
    }

    // Convert categoryId to number
    const categoryId = parseInt(categoryIdStr, 10);
    if (isNaN(categoryId)) {
      return { error: "Invalid category ID" };
    }

    // Parse JSON
    let bookmarksArray: unknown[];
    try {
      const parsed: unknown = JSON.parse(jsonData);
      if (!Array.isArray(parsed)) {
        return { error: "JSON must be an array of bookmark objects" };
      }
      bookmarksArray = parsed;
    } catch {
      return { error: "Invalid JSON format. Please check your JSON syntax." };
    }

    if (bookmarksArray.length === 0) {
      return { error: "No bookmarks found in JSON" };
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < bookmarksArray.length; i++) {
      const item = bookmarksArray[i];

      try {
        if (!isUnknownRecord(item)) {
          errors.push(`Item ${i + 1}: Expected an object`);
          errorCount++;
          continue;
        }
        const itemUrl = optionalString(item.url);
        const itemTitle = optionalString(item.title);
        // Validate required fields
        if (!itemUrl || !itemTitle) {
          errors.push(`Item ${i + 1}: Missing required fields (url, title)`);
          errorCount++;
          continue;
        }
        if (itemTitle.length > MAX_BOOKMARK_TITLE_LENGTH) {
          errors.push(
            `Item ${i + 1}: Title exceeds ${MAX_BOOKMARK_TITLE_LENGTH} characters`,
          );
          errorCount++;
          continue;
        }

        // Generate slug from title
        const slug = generateSlug(itemTitle);

        // Prepare bookmark data
        // Supported fields: url, title, tagline, description, logo_url, cover_url, whyStartups/why_startups, alternatives, pricingType/pricing_type
        // Map JSON fields to database fields:
        // - tagline -> description (for list view, short intro)
        // - description -> overview (for detail page, full description)
        // - logo_url -> favicon (logo image)
        // - cover_url -> ogImage (cover image)
        // - whyStartups/why_startups -> whyStartups (optional)
        // - alternatives -> alternatives (optional)

        const bookmarkData: BookmarkData = {
          title: itemTitle,
          description: optionalString(item.tagline) || "", // Tagline for list view
          url: itemUrl,
          overview: optionalString(item.description) || "", // Description for detail page
          whyStartups:
            optionalString(item.whyStartups) ||
            optionalString(item.why_startups), // Support both camelCase and snake_case
          alternatives: optionalString(item.alternatives), // Optional

          search_results: "",
          favicon: optionalString(item.logo_url) || "", // Only use logo_url
          ogImage: optionalString(item.cover_url) || "", // Only use cover_url
          slug: slug,
          categoryId: categoryId,
          isFavorite: false,
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Insert into database
        await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(bookmarks)
            .values(bookmarkData)
            .returning({ id: bookmarks.id });
          await replaceBookmarkCategories(tx, created.id, [categoryId], {
            source: "import",
            allowDraft: true,
          });
        });

        successCount++;
      } catch (error) {
        errorCount++;
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        const itemTitle = isUnknownRecord(item)
          ? optionalString(item.title)
          : null;
        errors.push(`Item ${i + 1} (${itemTitle || "Untitled"}): ${errorMsg}`);
        logger.error(`Error importing bookmark ${i + 1}:`, error);
      }
    }

    // Revalidate paths
    revalidatePath("/hi-studio");
    revalidatePath("/");
    invalidate(CACHE_TAGS.bookmarks);

    // Return results
    if (successCount === 0) {
      return {
        error: `Failed to import all bookmarks. Errors: ${errors.join("; ")}`,
      };
    } else if (errorCount > 0) {
      return {
        success: true,
        message: `Imported ${successCount} bookmarks. ${errorCount} failed. Errors: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`,
      };
    } else {
      return {
        success: true,
        message: `Successfully imported ${successCount} bookmarks!`,
      };
    }
  } catch (error) {
    logger.error("Error in importBookmarksFromJSON:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to import bookmarks",
    };
  }
}

// ============ Tag Actions ============
