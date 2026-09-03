import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  importBookmarkBatch,
  type BookmarkBatchItem,
} from "@/lib/bookmark-batch-import";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { verifyBearerToken } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).nullable().optional();
const optionalImage = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .url()
      .max(2_048)
      .refine((value) => new URL(value).protocol === "https:"),
  ])
  .nullable()
  .optional();
const keyFeatureSchema = z.union([
  z.string().trim().min(1).max(300),
  z
    .object({
      name: z.string().trim().min(1).max(160),
      description: z.string().trim().max(1_000).optional(),
    })
    .strict(),
]);

const batchSchema = z
  .object({
    bookmarks: z
      .array(
        z
          .object({
            url: z
              .string()
              .trim()
              .url()
              .max(2_048)
              .refine((value) => ["http:", "https:"].includes(new URL(value).protocol)),
            title: z.string().trim().min(1).max(500),
            slug: z
              .string()
              .trim()
              .min(1)
              .max(200)
              .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
              .optional(),
            description: optionalText(1_000),
            overview: optionalText(6_000),
            whyStartups: optionalText(3_000),
            alternatives: optionalText(2_000),
            favicon: optionalImage,
            ogImage: optionalImage,
            categoryId: z.number().int().positive().nullable().optional(),
            categoryIds: z.array(z.number().int().positive()).max(3).optional(),
            keyFeatures: z.array(keyFeatureSchema).max(30).optional(),
            useCases: z
              .array(z.string().trim().min(1).max(500))
              .max(30)
              .optional(),
            faqs: z
              .array(
                z
                  .object({
                    question: z.string().trim().min(1).max(500),
                    answer: z.string().trim().min(1).max(3_000),
                  })
                  .strict(),
              )
              .max(30)
              .optional(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict();

export async function POST(request: NextRequest) {
  if (!verifyBearerToken(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = batchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 },
      );
    }

    const results = await importBookmarkBatch(
      parsed.data.bookmarks as BookmarkBatchItem[],
    );
    if (results.some((result) => result.status === "created")) {
      revalidateTag(CACHE_TAGS.bookmarks, { expire: 0 });
      revalidateTag(CACHE_TAGS.categories, { expire: 0 });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    logger.error("Batch bookmark creation failed", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
