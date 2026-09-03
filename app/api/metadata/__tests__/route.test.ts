import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
  canUseManualMetadataEntry,
  MetadataFetchError,
} from "@/lib/fetch-metadata";
import { UrlValidationError } from "@/lib/url-validator";

let metadataFailure: Error | null = null;

mock.module("@/lib/get-session", () => ({
  getSession: async () => ({ user: { id: "metadata-test-user" } }),
}));

mock.module("@/lib/rate-limit", () => ({
  checkActionRateLimit: async () => ({ allowed: true, remaining: 19 }),
}));

mock.module("@/lib/data/submission-url-availability", () => ({
  getSubmissionUrlAvailability: async () => "available",
}));

mock.module("@/lib/logger", () => ({
  logger: { error: mock(), warn: mock() },
}));

mock.module("@/lib/fetch-metadata", () => ({
  MetadataFetchError,
  canUseManualMetadataEntry,
}));

mock.module("@/lib/submission-metadata-fetch", () => ({
  fetchSubmissionMetadata: async (url: string) => {
    if (metadataFailure) throw metadataFailure;
    return {
      favicon: "https://example.com/favicon.ico",
      ogImage: "",
      title: "Example",
      description: "Example description",
      url,
    };
  },
}));

const { GET } = await import("@/app/api/metadata/route");

function request(url = "https://example.com"): Request {
  return new Request(
    "https://hicyou.test/api/metadata?url=" + encodeURIComponent(url),
  );
}

beforeEach(() => {
  metadataFailure = null;
});

describe("submission metadata preflight", () => {
  test("allows manual entry when a public upstream blocks metadata access", async () => {
    metadataFailure = new MetadataFetchError("Upstream 403 Forbidden", 403);

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      availability: "available",
      description: "",
      favicon: "",
      metadataSource: "manual",
      ogImage: "",
      title: "",
      url: "https://example.com",
    });
  });

  test("keeps unsafe URL failures closed", async () => {
    metadataFailure = new UrlValidationError(
      "Requests to private networks are not allowed",
    );

    const response = await GET(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "This URL cannot be fetched safely",
    });
  });

  test("does not turn a missing upstream page into a manual submission", async () => {
    metadataFailure = new MetadataFetchError("Upstream 404 Not Found", 404);

    const response = await GET(request());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "We could not fetch website details. Check the URL and try again.",
    });
  });

  test("marks successful metadata as fetched", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      availability: "available",
      metadataSource: "fetched",
      title: "Example",
      url: "https://example.com",
    });
  });
});
