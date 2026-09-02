import { describe, expect, test } from "bun:test";
import { APIConnectionTimeoutError, APIUserAbortError } from "openai/error";

import {
  completeLLMJson,
  createLLMClient,
  extractLLMJson,
  getProviderRequestExtensions,
  LLMRequestError,
  retryLLMRequest,
  resolveLLMConfig,
  toSafeLLMError,
} from "@/lib/llm";
import { z } from "zod";

describe("unified LLM configuration", () => {
  test("prefers canonical AI variables and normalizes the base URL", () => {
    const config = resolveLLMConfig({
      AI_API_KEY: "canonical-key",
      AI_BASE_URL: "https://api.example.com/v1/",
      AI_MODEL: "next-model",
      DEEPSEEK_API_KEY: "legacy-key",
      AI_TIMEOUT_MS: "45000",
      AI_MAX_RETRIES: "1",
    });

    expect(config).toEqual({
      apiKey: "canonical-key",
      baseURL: "https://api.example.com/v1",
      model: "next-model",
      timeoutMs: 45_000,
      maxRetries: 1,
      source: "ai",
    });
  });

  test("keeps the requested local GLM key as a migration fallback", () => {
    const config = resolveLLMConfig(
      { DEEPSEEK_API_KEY: "deepseek-key" },
      { glmkey: "glm-key" },
    );

    expect(config?.source).toBe("legacy-glm");
    expect(config?.model).toBe("glm-5.3-flash");
    expect(config?.baseURL).toBe("https://open.bigmodel.cn/api/paas/v4");
  });

  test("rejects insecure production endpoints and invalid retry settings", () => {
    const credentialedUrl = [
      "https://user:password",
      "example.com/v1?debug=true",
    ].join("@");
    expect(() =>
      resolveLLMConfig({
        NODE_ENV: "production",
        AI_API_KEY: "key",
        AI_BASE_URL: "http://remote.example/v1",
      }),
    ).toThrow("HTTPS");
    expect(() =>
      resolveLLMConfig({
        AI_API_KEY: "key",
        AI_MAX_RETRIES: "99",
      }),
    ).toThrow("AI_MAX_RETRIES");
    expect(() =>
      resolveLLMConfig({
        AI_API_KEY: "key",
        AI_BASE_URL: credentialedUrl,
      }),
    ).toThrow("must not contain credentials");
  });

  test("returns null when no provider key exists", () => {
    expect(resolveLLMConfig({})).toBeNull();
  });

  test("constructs the SDK client from the resolved configuration", () => {
    const config = resolveLLMConfig({
      AI_API_KEY: "test-key",
      AI_BASE_URL: "https://api.example.com/v1",
      AI_MODEL: "test-model",
      AI_TIMEOUT_MS: "12000",
      AI_MAX_RETRIES: "0",
    });
    if (!config) throw new Error("Expected test LLM configuration");

    const client = createLLMClient(config);
    expect(client.baseURL).toBe("https://api.example.com/v1");
    expect(client.timeout).toBe(12_000);
    expect(client.maxRetries).toBe(0);
  });
});

describe("LLM JSON extraction", () => {
  test("accepts plain and fenced JSON", () => {
    expect(extractLLMJson('{"ok":true}')).toEqual({ ok: true });
    expect(extractLLMJson('```json\n{"ok":true}\n```')).toEqual({ ok: true });
    expect(
      extractLLMJson('Result: {"text":"a } inside a string"} trailing [note]'),
    ).toEqual({ text: "a } inside a string" });
  });

  test("rejects responses without a valid JSON value", () => {
    expect(() => extractLLMJson("not-json")).toThrow("invalid JSON");
  });
});

describe("LLM structured output retries", () => {
  const schema = z.object({
    title: z.string().min(1),
    categories: z.array(z.string()).min(1),
  });
  const baseOptions = {
    operation: "test.structured",
    messages: [{ role: "user" as const, content: "Return JSON" }],
    schema,
  };

  test("regenerates once after schema validation fails", async () => {
    const operations: string[] = [];
    const prompts: string[] = [];
    const responses = [
      '{"title":"First","categories":[]}',
      '{"title":"Second","categories":["ai"]}',
    ];

    const result = await completeLLMJson(
      { ...baseOptions, schemaRetries: 1 },
      async (options) => {
        operations.push(options.operation);
        prompts.push(String(options.messages.at(-1)?.content));
        return responses.shift() ?? "{}";
      },
    );

    expect(result).toEqual({ title: "Second", categories: ["ai"] });
    expect(operations).toEqual([
      "test.structured",
      "test.structured.schema_retry",
    ]);
    expect(prompts[1]).toContain("categories");
    expect(prompts[1]).not.toContain("First");
  });

  test("does not retry structured output unless explicitly enabled", async () => {
    let attempts = 0;
    const promise = completeLLMJson(baseOptions, async () => {
      attempts += 1;
      return "not-json";
    });

    await expect(promise).rejects.toMatchObject({
      name: "LLMRequestError",
      code: "invalid_json",
      retryable: false,
    });
    expect(attempts).toBe(1);
  });
});

describe("provider-specific request adaptation", () => {
  test("maps minimal reasoning to the selected GLM model capability", () => {
    expect(
      getProviderRequestExtensions(
        "https://open.bigmodel.cn/api/paas/v4",
        "glm-5.3-flash",
        "minimal",
      ),
    ).toEqual({ reasoning_effort: "low" });
    expect(
      getProviderRequestExtensions(
        "https://open.bigmodel.cn/api/paas/v4",
        "glm-5.2",
        "minimal",
      ),
    ).toEqual({ thinking: { type: "disabled" } });
    expect(
      getProviderRequestExtensions(
        "https://api.deepseek.com",
        "deepseek-chat",
        "minimal",
      ),
    ).toEqual({});
    expect(
      getProviderRequestExtensions(
        "https://open.bigmodel.cn/api/paas/v4",
        "glm-5.3-flash",
        "default",
      ),
    ).toEqual({});
  });
});

describe("LLM transport retries", () => {
  test("classifies connection timeouts but not caller aborts as retryable", () => {
    expect(toSafeLLMError(new APIConnectionTimeoutError()).retryable).toBe(
      true,
    );
    expect(toSafeLLMError(new APIUserAbortError()).retryable).toBe(false);
  });

  test("retries a transient provider failure once", async () => {
    let attempts = 0;
    const result = await retryLLMRequest(
      "test.retry",
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new LLMRequestError("temporary", {
            status: 500,
            retryable: true,
          });
        }
        return "ok";
      },
      { baseDelayMs: 0 },
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  test("does not retry schema or other permanent failures", async () => {
    let attempts = 0;
    await expect(
      retryLLMRequest(
        "test.no-retry",
        async () => {
          attempts += 1;
          throw new LLMRequestError("invalid schema", {
            code: "schema_validation",
          });
        },
        { baseDelayMs: 0 },
      ),
    ).rejects.toMatchObject({ code: "schema_validation", retryable: false });
    expect(attempts).toBe(1);
  });
});
