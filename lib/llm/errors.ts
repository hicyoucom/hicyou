export class LLMConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMConfigurationError";
  }
}

export class LLMRequestError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: { status?: number; code?: string; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = "LLMRequestError";
    this.status = options.status;
    this.code = options.code;
    this.retryable = options.retryable ?? false;
  }
}

type ProviderErrorShape = {
  status?: unknown;
  code?: unknown;
  message?: unknown;
};

function sanitizeProviderMessage(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b(?:sk|key)-[A-Za-z0-9_-]{12,}\b/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

/** Convert provider errors to a small, credential-free application error. */
export function toSafeLLMError(error: unknown): LLMRequestError {
  if (error instanceof LLMRequestError) return error;

  const providerError =
    error && typeof error === "object" ? (error as ProviderErrorShape) : {};
  const status =
    typeof providerError.status === "number" ? providerError.status : undefined;
  const code =
    typeof providerError.code === "string" ? providerError.code : undefined;
  const providerMessage =
    typeof providerError.message === "string"
      ? sanitizeProviderMessage(providerError.message)
      : "Unknown provider error";
  const constructorName =
    error instanceof Error ? error.constructor.name : "";
  const isConnectionFailure =
    constructorName === "APIConnectionError" ||
    constructorName === "APIConnectionTimeoutError";
  const retryable =
    isConnectionFailure ||
    status === 408 ||
    status === 409 ||
    status === 429 ||
    (status ?? 0) >= 500;

  return new LLMRequestError(`LLM request failed: ${providerMessage}`, {
    status,
    code,
    retryable,
  });
}
