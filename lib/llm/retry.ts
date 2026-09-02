import { logger } from "@/lib/logger";
import { LLMRequestError } from "@/lib/llm/errors";

type RetryLLMOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  signal?: AbortSignal;
  sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
};

function abortError(): DOMException {
  return new DOMException("The operation was aborted", "AbortError");
}

async function abortableDelay(
  delayMs: number,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) throw abortError();
  if (delayMs <= 0) return;

  await new Promise<void>((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    const timeout = setTimeout(finish, delayMs);
    const onAbort = () => {
      clearTimeout(timeout);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Retry only transport/provider failures explicitly classified as transient. */
export async function retryLLMRequest<T>(
  operation: string,
  task: () => Promise<T>,
  options: RetryLLMOptions = {},
): Promise<T> {
  const maxAttempts = Math.min(
    3,
    Math.max(1, Math.trunc(options.maxAttempts ?? 2)),
  );
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 500);
  const sleep = options.sleep ?? abortableDelay;

  for (let attempt = 1; ; attempt += 1) {
    if (options.signal?.aborted) throw abortError();
    try {
      return await task();
    } catch (error) {
      if (
        !(error instanceof LLMRequestError) ||
        !error.retryable ||
        attempt >= maxAttempts ||
        options.signal?.aborted
      ) {
        throw error;
      }

      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      logger.warn("Retrying transient LLM request failure", {
        operation,
        attempt,
        nextAttempt: attempt + 1,
        maxAttempts,
        delayMs,
        status: error.status,
        code: error.code,
      });
      await sleep(delayMs, options.signal);
    }
  }
}
