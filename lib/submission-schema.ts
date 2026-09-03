import { z } from "zod";

import { normalizePublicImageSource } from "@/lib/image-source";
import {
  MAX_SUBMISSION_DESCRIPTION_LENGTH,
  MAX_SUBMISSION_TAGLINE_LENGTH,
  MAX_SUBMISSION_TITLE_LENGTH,
} from "@/lib/submission-prefill";

const optionalText = (maxLength: number) =>
  z.string().trim().max(maxLength).optional().default("");

const publicImageSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => normalizePublicImageSource(value) !== null, {
    message: "Image URLs must be HTTPS URLs or same-origin paths",
  })
  .transform((value) => normalizePublicImageSource(value)!);

const keyFeatureSchema = z.union([
  z.string().trim().min(1).max(300),
  z
    .object({
      name: z.string().trim().min(1).max(160),
      description: z.string().trim().max(1000).optional(),
    })
    .strict(),
]);

export const submissionSchema = z
  .object({
    url: z.string().trim().min(1).max(2048),
    // Keep the API contract aligned with metadata prefill and the existing
    // submission title limit so a fetched page title is always editable
    // and submit-able without an unexplained server rejection.
    title: z.string().trim().min(1).max(MAX_SUBMISSION_TITLE_LENGTH),
    tagline: z.string().trim().min(1).max(MAX_SUBMISSION_TAGLINE_LENGTH),
    description: z
      .string()
      .trim()
      .min(1)
      .max(MAX_SUBMISSION_DESCRIPTION_LENGTH),
    whyStartups: optionalText(5_000),
    alternatives: optionalText(2_000),
    categoryId: z.coerce.number().int().positive(),
    categoryIds: z
      .array(z.coerce.number().int().positive())
      .max(3)
      .optional()
      .default([]),
    logo: publicImageSchema,
    cover: publicImageSchema,
    hasBadge: z.boolean().optional().default(false),
    keyFeatures: z.array(keyFeatureSchema).max(30).optional().default([]),
    useCases: z
      .array(z.string().trim().min(1).max(500))
      .max(30)
      .optional()
      .default([]),
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
      .optional()
      .default([]),
    turnstileToken: z.string().max(4096).nullable().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (new Set([data.categoryId, ...data.categoryIds]).size > 3) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryIds"],
        message: "Select at most 3 categories",
      });
    }
  })
  .transform((data) => ({
    ...data,
    categoryIds: [...new Set([data.categoryId, ...data.categoryIds])],
  }));

export type SubmissionInput = z.infer<typeof submissionSchema>;
