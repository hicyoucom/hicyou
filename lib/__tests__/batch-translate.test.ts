import { describe, expect, test } from "bun:test";

import {
  parseBatchTranslateInput,
  runBatchTranslation,
} from "@/lib/batch-translate";

describe("atomic batch translation", () => {
  test("does not persist an entity when a later model batch fails", async () => {
    const input = parseBatchTranslateInput({
      entityType: "bookmark",
      entityIds: [1],
      locale: "fr",
      fields: ["title", "description", "overview", "whyStartups"],
    });
    let translateCalls = 0;
    let persistCalls = 0;

    const result = await runBatchTranslation(input, {
      loadEntities: async () => [
        {
          id: 1,
          title: "Title",
          description: "Description",
          overview: "Overview",
          whyStartups: "Why",
          useCases: Array.from({ length: 8 }, (_, index) => `Use ${index}`),
        },
      ],
      translate: async (texts) => {
        translateCalls += 1;
        if (translateCalls === 2) throw new Error("upstream failed");
        return Object.fromEntries(
          Object.entries(texts).map(([field, value]) => [field, `fr:${value}`]),
        );
      },
      persist: async () => {
        persistCalls += 1;
      },
    });

    expect(translateCalls).toBe(2);
    expect(persistCalls).toBe(0);
    expect(result).toMatchObject({ succeeded: 0, failed: 1 });
  });

  test("persists all translated fields in one entity-level call", async () => {
    const input = parseBatchTranslateInput({
      entityType: "category",
      entityIds: "[2]",
      locale: "de",
      fields: '["name","description"]',
    });
    const persisted: Array<Record<string, string>> = [];

    const result = await runBatchTranslation(input, {
      loadEntities: async () => [
        { id: 2, name: "Design", description: "Design tools" },
      ],
      translate: async (texts) =>
        Object.fromEntries(
          Object.entries(texts).map(([field, value]) => [field, `de:${value}`]),
        ),
      persist: async (_type, _id, _locale, fields) => {
        persisted.push(fields);
      },
    });

    expect(result).toMatchObject({ succeeded: 1, failed: 0 });
    expect(persisted).toEqual([
      { name: "de:Design", description: "de:Design tools" },
    ]);
  });

  test("rejects unknown fields and the source locale", () => {
    expect(() =>
      parseBatchTranslateInput({
        entityType: "bookmark",
        entityIds: [1],
        locale: "fr",
        fields: ["notes"],
      }),
    ).toThrow();
    expect(() =>
      parseBatchTranslateInput({
        entityType: "bookmark",
        entityIds: [1],
        locale: "en",
        fields: ["title"],
      }),
    ).toThrow();
  });

  test("does not call the model or persistence after cancellation", async () => {
    const input = parseBatchTranslateInput({
      entityType: "category",
      entityIds: [3],
      locale: "ja",
      fields: ["name"],
    });
    const controller = new AbortController();
    controller.abort();
    let translateCalls = 0;
    let persistCalls = 0;

    const result = await runBatchTranslation(input, {
      signal: controller.signal,
      loadEntities: async () => [{ id: 3, name: "Security" }],
      translate: async () => {
        translateCalls += 1;
        return {};
      },
      persist: async () => {
        persistCalls += 1;
      },
    });

    expect(result.cancelled).toBe(true);
    expect(translateCalls).toBe(0);
    expect(persistCalls).toBe(0);
  });
});
