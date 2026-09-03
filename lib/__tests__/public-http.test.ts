import { describe, expect, test } from "bun:test";

import {
  createPinnedRequestOptions,
  fetchPublicHttpUrl,
  type PublicHttpRequestInit,
} from "@/lib/public-http";
import { safeFetchHtml } from "@/lib/fetch-metadata";
import type { ResolvedPublicUrl } from "@/lib/url-validator";

describe("public HTTP transport", () => {
  test("identifies metadata requests as HiCyou", async () => {
    let requestInit: PublicHttpRequestInit | undefined;
    const result = await safeFetchHtml(
      new URL("https://example.com/product"),
      async (_url, init) => {
        requestInit = init;
        return new Response("<html><title>Example</title></html>", {
          headers: { "content-type": "text/html" },
        });
      },
    );

    expect(new Headers(requestInit?.headers).get("user-agent")).toBe(
      "Mozilla/5.0 (compatible; HiCyouBot/1.0; +https://hicyou.com)",
    );
    expect(result.url.toString()).toBe("https://example.com/product");
  });

  test("connects to the validated IP while preserving Host and TLS SNI", () => {
    const target: ResolvedPublicUrl = {
      url: new URL("https://service.example/path?item=1"),
      addresses: [{ address: "93.184.216.34", family: 4 }],
    };
    const options = createPinnedRequestOptions(target, target.addresses[0], {
      method: "POST",
      body: "payload",
    });

    expect(options.hostname).toBe("93.184.216.34");
    expect(options.servername).toBe("service.example");
    expect(options.path).toBe("/path?item=1");
    expect(options.port).toBe(443);
    expect(options.headers).toMatchObject({
      host: "service.example",
      "content-length": "7",
    });
  });

  test("uses one DNS result for both validation and the actual transport", async () => {
    let resolutions = 0;
    const response = await fetchPublicHttpUrl(
      "https://rebind.example/resource",
      {},
      {
        resolver: async () => {
          resolutions += 1;
          return resolutions === 1
            ? [{ address: "93.184.216.34", family: 4 }]
            : [{ address: "127.0.0.1", family: 4 }];
        },
        transport: async (target) => {
          expect(target.addresses).toEqual([
            { address: "93.184.216.34", family: 4 },
          ]);
          return new Response("safe");
        },
      },
    );

    expect(await response.text()).toBe("safe");
    expect(resolutions).toBe(1);
  });

  test("rejects mixed public/private answers before the transport runs", async () => {
    let transported = false;
    await expect(
      fetchPublicHttpUrl(
        "https://mixed.example",
        {},
        {
          resolver: async () => [
            { address: "93.184.216.34", family: 4 },
            { address: "169.254.169.254", family: 4 },
          ],
          transport: async () => {
            transported = true;
            return new Response();
          },
        },
      ),
    ).rejects.toThrow("private or non-public networks");
    expect(transported).toBe(false);
  });
});
