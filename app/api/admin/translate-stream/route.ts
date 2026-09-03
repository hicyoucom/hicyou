import { z } from "zod";

import { defaultLocale, locales } from "@/i18n/config";
import { logAdminAction, requireAdmin } from "@/lib/admin-auth";
import {
  parseBatchTranslateInput,
  runBatchTranslation,
  type BatchTranslationResult,
} from "@/lib/batch-translate";
import {
  getUntranslatedBookmarkIds,
  getUntranslatedCategoryIds,
} from "@/lib/data";
import { logger } from "@/lib/logger";
import { translationFields } from "@/lib/translation-fields";

export const maxDuration = 300;

const requestSchema = z.object({
  locale: z.enum(locales).refine((locale) => locale !== defaultLocale),
  count: z.number().int().min(1).max(100),
  entityType: z.enum(["bookmark", "category"]).default("bookmark"),
});

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return jsonResponse({ error: "Unauthorized" }, auth.status);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Invalid translation parameters" }, 400);
  }

  const { locale, count, entityType } = parsed.data;
  let untranslatedIds: number[];
  try {
    untranslatedIds =
      entityType === "category"
        ? await getUntranslatedCategoryIds(locale)
        : await getUntranslatedBookmarkIds(locale);
  } catch (error) {
    logger.error("Failed to load untranslated entities", {
      entityType,
      locale,
      error,
    });
    return jsonResponse({ error: "Failed to load untranslated items" }, 500);
  }
  const entityIds = untranslatedIds.slice(0, count);
  if (entityIds.length === 0) {
    return jsonResponse(
      { error: "No untranslated items for this locale" },
      400,
    );
  }

  const input = parseBatchTranslateInput({
    entityType,
    entityIds,
    locale,
    fields: [...translationFields[entityType]],
  });
  logAdminAction({
    actorEmail: auth.email,
    action: "translate.stream.started",
    request,
    status: 202,
    targetType: entityType,
    metadata: { locale, count: entityIds.length },
  });

  const encoder = new TextEncoder();
  const lifecycle = new AbortController();
  const abort = () => lifecycle.abort();
  if (request.signal.aborted) abort();
  else request.signal.addEventListener("abort", abort, { once: true });
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: Record<string, unknown>): boolean => {
        if (closed || lifecycle.signal.aborted) return false;
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
          return true;
        } catch {
          closed = true;
          lifecycle.abort();
          return false;
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // Next may already have cancelled the source after a disconnect.
        }
      };
      const heartbeat = setInterval(() => {
        if (closed || lifecycle.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          closed = true;
          lifecycle.abort();
        }
      }, 15_000);

      void (async () => {
        let result: BatchTranslationResult | null = null;
        try {
          result = await runBatchTranslation(input, {
            signal: lifecycle.signal,
            onProgress: (progress) => {
              send("log", progress);
            },
          });
          if (!result.cancelled) {
            send("done", {
              translated: result.succeeded,
              failed: result.failed,
              skipped: result.skipped,
              total: result.requested,
              cancelled: false,
            });
          }
        } catch (error) {
          if (!lifecycle.signal.aborted) {
            logger.error("Translation stream failed", {
              entityType,
              locale,
              error,
            });
            send("log", {
              message: `Translation stopped: ${error instanceof Error ? error.message : "Unknown error"}`,
              index: result?.succeeded ?? 0,
              total: entityIds.length,
              status: "error",
            });
            send("done", {
              translated: result?.succeeded ?? 0,
              failed: result?.failed ?? entityIds.length,
              skipped: result?.skipped ?? 0,
              total: entityIds.length,
              cancelled: false,
            });
          }
        } finally {
          clearInterval(heartbeat);
          request.signal.removeEventListener("abort", abort);
          logAdminAction({
            actorEmail: auth.email,
            action: "translate.stream.completed",
            request,
            status: lifecycle.signal.aborted
              ? 499
              : result && result.failed === 0
                ? 200
                : 207,
            targetType: entityType,
            metadata: {
              locale,
              requested: entityIds.length,
              succeeded: result?.succeeded ?? 0,
              failed: result?.failed ?? entityIds.length,
              skipped: result?.skipped ?? 0,
              cancelled: lifecycle.signal.aborted || result?.cancelled === true,
            },
          });
          close();
        }
      })();
    },
    cancel() {
      closed = true;
      lifecycle.abort();
      request.signal.removeEventListener("abort", abort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
