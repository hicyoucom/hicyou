import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { parse as parseEnv } from "dotenv";

import { LLMConfigurationError } from "@/lib/llm/errors";

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const GLM_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_MAX_RETRIES = 2;

type Environment = Record<string, string | undefined>;

export type LLMConfigSource =
  | "ai"
  | "legacy-glm"
  | "legacy-deepseek"
  | "legacy-openai";

export type LLMConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  source: LLMConfigSource;
};

let cachedHomeEnvironment: Environment | undefined;

function getHomeEnvironment(): Environment {
  if (process.env.NODE_ENV === "production") return {};
  if (cachedHomeEnvironment) return cachedHomeEnvironment;

  try {
    const parsed = parseEnv(readFileSync(join(homedir(), ".env"), "utf8"));
    cachedHomeEnvironment = {
      AI_API_KEY: parsed.AI_API_KEY,
      AI_BASE_URL: parsed.AI_BASE_URL,
      AI_MODEL: parsed.AI_MODEL,
      GLM_API_KEY: parsed.GLM_API_KEY,
      glmkey: parsed.glmkey,
    };
  } catch {
    cachedHomeEnvironment = {};
  }
  return cachedHomeEnvironment;
}

function value(environment: Environment, name: string): string {
  return environment[name]?.trim() || "";
}

function parseInteger(
  raw: string,
  fallback: number,
  name: string,
  minimum: number,
  maximum: number,
): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new LLMConfigurationError(
      `${name} must be an integer between ${minimum} and ${maximum}`,
    );
  }
  return parsed;
}

function normalizeBaseURL(raw: string, nodeEnv: string | undefined): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new LLMConfigurationError("AI_BASE_URL must be a valid absolute URL");
  }

  const localHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (nodeEnv === "production" && url.protocol !== "https:" && !localHost) {
    throw new LLMConfigurationError("AI_BASE_URL must use HTTPS in production");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new LLMConfigurationError("AI_BASE_URL must use HTTP or HTTPS");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new LLMConfigurationError(
      "AI_BASE_URL must not contain credentials, query parameters, or fragments",
    );
  }
  return raw.replace(/\/+$/, "");
}

function resolveProvider(
  environment: Environment,
  homeEnvironment: Environment,
): {
  apiKey: string;
  baseURL: string;
  model: string;
  source: LLMConfigSource;
} | null {
  const canonicalKey = value(environment, "AI_API_KEY");
  if (canonicalKey) {
    return {
      apiKey: canonicalKey,
      baseURL: value(environment, "AI_BASE_URL") || OPENAI_BASE_URL,
      model: value(environment, "AI_MODEL") || "gpt-4o-mini",
      source: "ai",
    };
  }

  // One-release migration bridge for this server's existing ~/.env glmkey.
  // Explicit AI_* values always win and are the only supported long-term API.
  const glmKey =
    value(environment, "GLM_API_KEY") ||
    value(environment, "glmkey") ||
    value(homeEnvironment, "GLM_API_KEY") ||
    value(homeEnvironment, "glmkey");
  if (glmKey) {
    return {
      apiKey: glmKey,
      baseURL:
        value(environment, "AI_BASE_URL") ||
        value(homeEnvironment, "AI_BASE_URL") ||
        GLM_BASE_URL,
      model:
        value(environment, "AI_MODEL") ||
        value(homeEnvironment, "AI_MODEL") ||
        "glm-5.3-flash",
      source: "legacy-glm",
    };
  }

  const deepSeekKey = value(environment, "DEEPSEEK_API_KEY");
  if (deepSeekKey) {
    return {
      apiKey: deepSeekKey,
      baseURL: value(environment, "AI_BASE_URL") || DEEPSEEK_BASE_URL,
      model: value(environment, "AI_MODEL") || "deepseek-reasoner",
      source: "legacy-deepseek",
    };
  }

  const openAIKey = value(environment, "OPENAI_API_KEY");
  if (openAIKey) {
    return {
      apiKey: openAIKey,
      baseURL: value(environment, "AI_BASE_URL") || OPENAI_BASE_URL,
      model: value(environment, "AI_MODEL") || "gpt-4o-mini",
      source: "legacy-openai",
    };
  }
  return null;
}

export function resolveLLMConfig(
  environment: Environment,
  homeEnvironment: Environment = {},
): LLMConfig | null {
  const provider = resolveProvider(environment, homeEnvironment);
  if (!provider) return null;

  return {
    ...provider,
    baseURL: normalizeBaseURL(provider.baseURL, environment.NODE_ENV),
    timeoutMs: parseInteger(
      value(environment, "AI_TIMEOUT_MS"),
      DEFAULT_TIMEOUT_MS,
      "AI_TIMEOUT_MS",
      1_000,
      600_000,
    ),
    maxRetries: parseInteger(
      value(environment, "AI_MAX_RETRIES"),
      DEFAULT_MAX_RETRIES,
      "AI_MAX_RETRIES",
      0,
      5,
    ),
  };
}

export function getLLMConfig(): LLMConfig {
  const config = resolveLLMConfig(process.env, getHomeEnvironment());
  if (!config) {
    throw new LLMConfigurationError(
      "LLM is not configured. Set AI_API_KEY, AI_BASE_URL, and AI_MODEL.",
    );
  }
  return config;
}

export function isLLMConfigured(): boolean {
  return resolveLLMConfig(process.env, getHomeEnvironment()) !== null;
}

export function getLLMPublicInfo(): Omit<LLMConfig, "apiKey"> & {
  endpoint: string;
} {
  const config = getLLMConfig();
  return {
    baseURL: config.baseURL,
    model: config.model,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    source: config.source,
    endpoint: new URL(config.baseURL).host,
  };
}
