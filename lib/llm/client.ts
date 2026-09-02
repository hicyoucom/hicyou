import OpenAI from "openai";
import type { z } from "zod";

import { logger } from "@/lib/logger";
import { getLLMConfig, type LLMConfig } from "@/lib/llm/config";
import { LLMRequestError, toSafeLLMError } from "@/lib/llm/errors";

export type LLMMessage = OpenAI.Chat.ChatCompletionMessageParam;

export type LLMCompletionOptions = {
  operation: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
  maxRetries?: number;
  reasoning?: "default" | "minimal";
  signal?: AbortSignal;
};

export type LLMJsonCompletionOptions<T> = LLMCompletionOptions & {
  schema: z.ZodType<T>;
  /** Regenerate malformed structured output. Separate from HTTP retries. */
  schemaRetries?: number;
};

type LLMCompletion = (options: LLMCompletionOptions) => Promise<string>;

const MAX_SCHEMA_RETRIES = 2;
const MAX_REPORTED_SCHEMA_ISSUES = 8;

export function getProviderRequestExtensions(
  baseURL: string,
  model: string,
  reasoning: LLMCompletionOptions["reasoning"],
): Record<string, unknown> {
  if (
    reasoning !== "minimal" ||
    new URL(baseURL).hostname !== "open.bigmodel.cn"
  ) {
    return {};
  }
  // GLM 5.3 always reasons and rejects `thinking: disabled`; its cheapest
  // supported tier is low. Earlier GLM Chat Completions models can disable it.
  if (/^glm-5\.3(?:-|$)/i.test(model)) {
    return { reasoning_effort: "low" };
  }
  if (/^glm-/i.test(model)) {
    return { thinking: { type: "disabled" } };
  }
  return {};
}

export function createLLMClient(config: LLMConfig = getLLMConfig()): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: config.timeoutMs,
    maxRetries: config.maxRetries,
  });
}

export async function completeLLM(
  options: LLMCompletionOptions,
): Promise<string> {
  const config = getLLMConfig();
  const startedAt = Date.now();

  try {
    const body = {
      model: config.model,
      messages: options.messages,
      ...(options.temperature === undefined
        ? {}
        : { temperature: options.temperature }),
      ...(options.maxTokens === undefined
        ? {}
        : { max_tokens: options.maxTokens }),
      ...(options.jsonMode
        ? { response_format: { type: "json_object" as const } }
        : {}),
      ...getProviderRequestExtensions(
        config.baseURL,
        config.model,
        options.reasoning,
      ),
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;
    const response = await createLLMClient(config).chat.completions.create(
      body,
      {
        timeout: options.timeoutMs ?? config.timeoutMs,
        maxRetries: options.maxRetries ?? config.maxRetries,
        signal: options.signal,
      },
    );
    const content = response.choices[0]?.message?.content?.trim() || "";
    if (!content) throw new LLMRequestError("LLM returned empty content");

    logger.info("LLM request completed", {
      operation: options.operation,
      model: config.model,
      endpoint: new URL(config.baseURL).host,
      durationMs: Date.now() - startedAt,
      outputChars: content.length,
    });
    return content;
  } catch (error) {
    const safeError = toSafeLLMError(error);
    const context = {
      operation: options.operation,
      model: config.model,
      endpoint: new URL(config.baseURL).host,
      durationMs: Date.now() - startedAt,
      status: safeError.status,
      code: safeError.code,
      retryable: safeError.retryable,
      message: safeError.message,
    };
    if (options.signal?.aborted) {
      logger.info("LLM request cancelled", context);
    } else if (safeError.retryable) {
      logger.warn("LLM request failed with a retryable error", context);
    } else {
      logger.error("LLM request failed", context);
    }
    throw safeError;
  }
}

export function extractLLMJson(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
    try {
      if (fenced) return JSON.parse(fenced) as unknown;
      return JSON.parse(findBalancedJSON(trimmed)) as unknown;
    } catch {
      throw new LLMRequestError("LLM returned invalid JSON");
    }
  }
}

function findBalancedJSON(content: string): string {
  const start = content.search(/[\[{]/);
  if (start === -1) throw new Error("No JSON value found");

  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (let index = start; index < content.length; index += 1) {
    const character = content[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{" || character === "[") stack.push(character);
    else if (character === "}" || character === "]") {
      const expected = character === "}" ? "{" : "[";
      if (stack.pop() !== expected) throw new Error("Unbalanced JSON value");
      if (stack.length === 0) return content.slice(start, index + 1);
    }
  }
  throw new Error("Unbalanced JSON value");
}

type StructuredOutputFailure = {
  reason: "invalid_json" | "schema_validation";
  issues: Array<{ path: string; code: string }>;
};

function parseStructuredOutput<T>(
  content: string,
  schema: z.ZodType<T>,
):
  | { success: true; data: T }
  | { success: false; failure: StructuredOutputFailure } {
  let value: unknown;
  try {
    value = extractLLMJson(content);
  } catch {
    return {
      success: false,
      failure: { reason: "invalid_json", issues: [] },
    };
  }

  const parsed = schema.safeParse(value);
  if (parsed.success) return { success: true, data: parsed.data };
  return {
    success: false,
    failure: {
      reason: "schema_validation",
      issues: parsed.error.issues
        .slice(0, MAX_REPORTED_SCHEMA_ISSUES)
        .map((issue) => ({
          path: issue.path.length > 0 ? issue.path.join(".") : "$",
          code: issue.code,
        })),
    },
  };
}

function boundedSchemaRetries(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_SCHEMA_RETRIES, Math.max(0, Math.trunc(value ?? 0)));
}

function schemaRepairMessage(failure: StructuredOutputFailure): LLMMessage {
  return {
    role: "user",
    content: `Generate the complete JSON object again. The earlier attempt failed ${failure.reason}. Correct every required field and obey the original schema exactly. Validation diagnostics: ${JSON.stringify(failure.issues)}. Return JSON only.`,
  };
}

export async function completeLLMJson<T>(
  options: LLMJsonCompletionOptions<T>,
  completion: LLMCompletion = completeLLM,
): Promise<T> {
  const {
    schema,
    schemaRetries: requestedSchemaRetries,
    ...completionOptions
  } = options;
  const schemaRetries = boundedSchemaRetries(requestedSchemaRetries);
  let messages = completionOptions.messages;
  let lastFailure: StructuredOutputFailure = {
    reason: "schema_validation",
    issues: [],
  };

  for (let attempt = 0; attempt <= schemaRetries; attempt += 1) {
    const content = await completion({
      ...completionOptions,
      operation:
        attempt === 0
          ? completionOptions.operation
          : `${completionOptions.operation}.schema_retry`,
      messages,
      jsonMode: true,
    });
    const parsed = parseStructuredOutput(content, schema);
    if (parsed.success) return parsed.data;

    lastFailure = parsed.failure;
    logger.warn("LLM structured response rejected", {
      operation: completionOptions.operation,
      attempt: attempt + 1,
      maxAttempts: schemaRetries + 1,
      reason: parsed.failure.reason,
      issues: parsed.failure.issues,
    });
    messages = [
      ...completionOptions.messages,
      schemaRepairMessage(parsed.failure),
    ];
  }

  throw new LLMRequestError(
    lastFailure.reason === "invalid_json"
      ? "LLM returned invalid JSON"
      : "LLM response failed schema validation",
    { code: lastFailure.reason },
  );
}
