/**
 * Minimal leveled logger. A thin wrapper over `console` for now, but it gives
 * the codebase a single seam to:
 *  - silence `debug`/`info` in production (LOG_LEVEL env),
 *  - later swap in a structured/remote sink (Axiom, Sentry, etc.) without
 *    touching call sites.
 *
 * Migrate `console.*` in app/ and lib/ to this incrementally.
 */
import { captureException } from "@/lib/error-reporting";

type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};
const MAX_LOG_STRING_LENGTH = 4_000;
const MAX_LOG_COLLECTION_LENGTH = 50;
const MAX_LOG_DEPTH = 6;
const SENSITIVE_KEY =
  /password|passwd|secret|token|authorization|cookie|api.?key|private.?key/i;

function threshold(): number {
  const env =
    (process.env.LOG_LEVEL as Level | undefined) ??
    (process.env.NODE_ENV === "production" ? "info" : "debug");
  return ORDER[env] ?? ORDER.info;
}

function sanitizeText(value: string): string {
  return value
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b(?:sk|key)-[A-Za-z0-9_-]{12,}\b/g, "[redacted]")
    .replace(/(https?:\/\/)([^/\s:@]+):([^@\s/]+)@/gi, "$1[redacted]@")
    .replace(/([?&](?:token|key|secret|password)=)[^&\s]+/gi, "$1[redacted]")
    .slice(0, MAX_LOG_STRING_LENGTH);
}

function serializeLogValue(
  value: unknown,
  seen: WeakSet<object>,
  depth = 0,
  key = "",
): unknown {
  if (key && SENSITIVE_KEY.test(key)) return "[redacted]";
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === "string") return sanitizeText(value);
  if (typeof value === "number")
    return Number.isFinite(value) ? value : String(value);
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol")
    return `[${typeof value}]`;
  if (depth >= MAX_LOG_DEPTH) return "[max-depth]";
  if (typeof value !== "object") return String(value);
  try {
    if (seen.has(value)) return "[circular]";
    seen.add(value);

    if (value instanceof Date) {
      return Number.isNaN(value.getTime())
        ? "Invalid Date"
        : value.toISOString();
    }
    if (value instanceof Error) {
      const errorRecord = value as Error & {
        status?: unknown;
        code?: unknown;
        retryable?: unknown;
        cause?: unknown;
      };
      return {
        name: sanitizeText(value.name),
        message: sanitizeText(value.message),
        ...(value.stack ? { stack: sanitizeText(value.stack) } : {}),
        ...(errorRecord.status !== undefined
          ? {
              status: serializeLogValue(
                errorRecord.status,
                seen,
                depth + 1,
                "status",
              ),
            }
          : {}),
        ...(errorRecord.code !== undefined
          ? {
              code: serializeLogValue(
                errorRecord.code,
                seen,
                depth + 1,
                "code",
              ),
            }
          : {}),
        ...(errorRecord.retryable !== undefined
          ? { retryable: Boolean(errorRecord.retryable) }
          : {}),
        ...(errorRecord.cause !== undefined
          ? {
              cause: serializeLogValue(
                errorRecord.cause,
                seen,
                depth + 1,
                "cause",
              ),
            }
          : {}),
      };
    }
    if (Array.isArray(value)) {
      return value
        .slice(0, MAX_LOG_COLLECTION_LENGTH)
        .map((item) => serializeLogValue(item, seen, depth + 1));
    }

    return Object.fromEntries(
      Object.entries(value)
        .slice(0, MAX_LOG_COLLECTION_LENGTH)
        .map(([entryKey, entryValue]) => [
          entryKey,
          serializeLogValue(entryValue, seen, depth + 1, entryKey),
        ]),
    );
  } catch {
    return "[unserializable]";
  }
}

export function formatLogEntry(
  level: Level,
  args: unknown[],
  timestamp = new Date(),
): string {
  const [first, ...rest] = args;
  const message =
    typeof first === "string" ? sanitizeText(first) : `${level} event`;
  const contextValues = typeof first === "string" ? rest : args;
  const seen = new WeakSet<object>();
  const context =
    contextValues.length === 0
      ? undefined
      : contextValues.length === 1
        ? serializeLogValue(contextValues[0], seen)
        : serializeLogValue(contextValues, seen);

  const normalizedTimestamp = Number.isNaN(timestamp.getTime())
    ? "invalid"
    : timestamp.toISOString();
  return JSON.stringify({
    timestamp: normalizedTimestamp,
    level,
    message,
    ...(context === undefined ? {} : { context }),
  });
}

function findNestedError(
  value: unknown,
  seen: WeakSet<object>,
  depth = 0,
): Error | undefined {
  if (value instanceof Error) return value;
  if (depth >= MAX_LOG_DEPTH || value === null || typeof value !== "object")
    return undefined;
  try {
    if (seen.has(value)) return undefined;
    seen.add(value);
    const values = Array.isArray(value) ? value : Object.values(value);
    for (const nested of values.slice(0, MAX_LOG_COLLECTION_LENGTH)) {
      const error = findNestedError(nested, seen, depth + 1);
      if (error) return error;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function emit(level: Level, args: unknown[]) {
  if (ORDER[level] < threshold()) return;
  const fn = level === "error" ? console.error : console.log;
  fn(formatLogEntry(level, args));

  // Forward errors to the (currently no-op) reporting seam — one hook here
  // covers every logger.error call site in the codebase.
  if (level === "error") {
    const error = findNestedError(args, new WeakSet<object>());
    const safeContext = serializeLogValue(args, new WeakSet<object>());
    const fallbackMessage =
      typeof args[0] === "string" ? sanitizeText(args[0]) : "Logged error";
    captureException(error ?? fallbackMessage, { extra: safeContext });
  }
}

export const logger = {
  debug: (...args: unknown[]) => emit("debug", args),
  info: (...args: unknown[]) => emit("info", args),
  warn: (...args: unknown[]) => emit("warn", args),
  error: (...args: unknown[]) => emit("error", args),
};
