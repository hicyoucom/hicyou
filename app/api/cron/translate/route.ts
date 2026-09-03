import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { defaultLocale, locales } from "@/i18n/config";
import {
  parseBatchTranslateInput,
  runBatchTranslation,
} from "@/lib/batch-translate";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { verifyCronAuth } from "@/lib/cron-auth";
import { getUntranslatedBookmarkIds } from "@/lib/data";
import { logger } from "@/lib/logger";
import { translationFields } from "@/lib/translation-fields";

export const maxDuration = 120;

export const MAX_TRANSLATION_CRON_BATCH_SIZE = 2;
export const TRANSLATION_CRON_TIMEOUT_MS = 100_000;

const targetLocales = locales.filter((locale) => locale !== defaultLocale);
const requestSchema = z.object({
  locale: z.enum(locales).refine((locale) => locale !== defaultLocale),
  batchSize: z.number().int().min(1).max(MAX_TRANSLATION_CRON_BATCH_SIZE),
});

export function parseTranslationCronRequest(request: Request): {
  locale: (typeof locales)[number];
  batchSize: number;
} {
  const searchParams = new URL(request.url).searchParams;
  const rawBatchSize = searchParams.get("batch");
  return requestSchema.parse({
    locale: searchParams.get("locale"),
    batchSize:
      rawBatchSize === null
        ? MAX_TRANSLATION_CRON_BATCH_SIZE
        : Number(rawBatchSize),
  });
}

async function handle(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestOptions: ReturnType<typeof parseTranslationCronRequest>;
  try {
    requestOptions = parseTranslationCronRequest(request);
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    return NextResponse.json(
      {
        error: `A single target locale and a batch size between 1 and ${MAX_TRANSLATION_CRON_BATCH_SIZE} are required`,
        allowedLocales: targetLocales,
        maxBatchSize: MAX_TRANSLATION_CRON_BATCH_SIZE,
      },
      { status: 400 },
    );
  }

  const { locale, batchSize } = requestOptions;
  const results: Record<string, unknown> = {};
  let hasFailures = false;
  let timedOut = false;
  const abortController = new AbortController();
  const abortForDisconnect = () => abortController.abort();
  if (request.signal.aborted) abortForDisconnect();
  else {
    request.signal.addEventListener("abort", abortForDisconnect, {
      once: true,
    });
  }
  const deadline = setTimeout(() => {
    timedOut = true;
    abortController.abort();
  }, TRANSLATION_CRON_TIMEOUT_MS);

  try {
    const untranslatedIds = await getUntranslatedBookmarkIds(locale);
    if (untranslatedIds.length === 0) {
      results[locale] = { status: "up_to_date", remaining: 0 };
    } else {
      const entityIds = untranslatedIds.slice(0, batchSize);

      const input = parseBatchTranslateInput({
        entityType: "bookmark",
        entityIds,
        locale,
        fields: [...translationFields.bookmark],
      });
      const result = await runBatchTranslation(input, {
        signal: abortController.signal,
      });
      clearTimeout(deadline);

      if (result.succeeded > 0) {
        revalidateTag(CACHE_TAGS.translations, { expire: 0 });
        revalidatePath(`/${locale}`, "layout");
      }
      if (result.failed > 0 || result.cancelled) hasFailures = true;

      const remaining = (await getUntranslatedBookmarkIds(locale)).length;
      results[locale] = {
        status: result.cancelled
          ? timedOut
            ? "timed_out"
            : "cancelled"
          : result.failed === 0
            ? "translated"
            : result.succeeded > 0
              ? "partial"
              : "error",
        requested: result.requested,
        translated: result.succeeded,
        failed: result.failed,
        skipped: result.skipped,
        remaining,
        timedOut,
        failures: result.failures,
      };
    }
  } catch (error) {
    hasFailures = true;
    logger.error("Translation cron locale failed", { locale, error });
    results[locale] = {
      status: "error",
      error: "Translation locale failed",
    };
  } finally {
    clearTimeout(deadline);
    request.signal.removeEventListener("abort", abortForDisconnect);
  }

  return NextResponse.json(
    {
      success: !hasFailures && !timedOut,
      results,
      timestamp: new Date().toISOString(),
    },
    { status: timedOut ? 504 : hasFailures ? 502 : 200 },
  );
}

// Keep GET for existing schedulers; new integrations should use POST because
// this endpoint mutates translation state.
export const POST = handle;
export const GET = handle;
