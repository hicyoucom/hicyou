import { describe, expect, test } from "bun:test";

import {
  MAX_TRANSLATION_CRON_BATCH_SIZE,
  parseTranslationCronRequest,
} from "@/app/api/cron/translate/route";

function request(query = ""): Request {
  return new Request(`https://hicyou.com/api/cron/translate${query}`);
}

describe("translation cron request parameters", () => {
  test("requires one target locale and defaults to the safe batch size", () => {
    expect(parseTranslationCronRequest(request("?locale=fr"))).toEqual({
      locale: "fr",
      batchSize: MAX_TRANSLATION_CRON_BATCH_SIZE,
    });
  });

  test("accepts only batch sizes one and two", () => {
    expect(parseTranslationCronRequest(request("?locale=zh&batch=1"))).toEqual({
      locale: "zh",
      batchSize: 1,
    });
    expect(() =>
      parseTranslationCronRequest(request("?locale=zh&batch=3")),
    ).toThrow();
    expect(() =>
      parseTranslationCronRequest(request("?locale=zh&batch=2junk")),
    ).toThrow();
  });

  test("rejects missing, unknown, and source locales", () => {
    expect(() => parseTranslationCronRequest(request())).toThrow();
    expect(() => parseTranslationCronRequest(request("?locale=en"))).toThrow();
    expect(() =>
      parseTranslationCronRequest(request("?locale=unknown")),
    ).toThrow();
  });
});
