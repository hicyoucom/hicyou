import { load } from "cheerio";
import { fetchPublicHttpUrl, type PublicHttpFetcher } from "@/lib/public-http";
import { parseHttpUrl } from "@/lib/url-validator";

const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 6_000;

export type SiteMetadata = {
  favicon: string;
  ogImage: string;
  title: string;
  description: string;
  url: string;
};

/** A response from a public website that declined our metadata request. */
export class MetadataFetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "MetadataFetchError";
  }
}

/**
 * Some legitimate sites reject bots but can still be submitted through the
 * manual form. Keep this narrow: URL validation, DNS failures, redirects, and
 * malformed responses must continue to fail closed.
 */
export function canUseManualMetadataEntry(error: unknown): boolean {
  return (
    error instanceof MetadataFetchError &&
    (error.status === 401 || error.status === 403 || error.status === 429)
  );
}

function isHtmlContentType(contentType: string | null): boolean {
  const normalized = contentType?.toLowerCase();
  return (
    !normalized ||
    normalized.includes("text/html") ||
    normalized.includes("application/xhtml+xml")
  );
}

function compactText(value: string, maximumLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maximumLength);
}

function resolveHttpAssetUrl(value: string, base: URL): string {
  try {
    const url = new URL(value, base);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

/**
 * Fetches HTML through an address-pinned public-network transport, including
 * independent validation for every redirect hop. Metadata URLs are user
 * controlled and are never added to Next's persistent fetch cache.
 */
export async function safeFetchHtml(
  initial: URL,
  fetchImpl: PublicHttpFetcher = fetchPublicHttpUrl,
): Promise<{ url: URL; html: string }> {
  let current = initial;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetchImpl(current, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; DirectoryBot/1.0; +https://hicyou.com)",
        },
        signal: abortController.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error("Redirect without Location header");
        }

        void response.body?.cancel().catch(() => undefined);
        try {
          current = new URL(location, current);
        } catch {
          throw new Error("Invalid redirect location");
        }
        continue;
      }

      if (!response.ok) {
        void response.body?.cancel().catch(() => undefined);
        throw new MetadataFetchError(
          "Upstream " + response.status + " " + response.statusText,
          response.status,
        );
      }

      if (!isHtmlContentType(response.headers.get("content-type"))) {
        void response.body?.cancel().catch(() => undefined);
        throw new Error("Response is not an HTML document");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const html = await response.text();
        if (new TextEncoder().encode(html).byteLength > MAX_BYTES) {
          throw new Error("Response too large");
        }
        return { url: current, html };
      }

      const decoder = new TextDecoder();
      let received = 0;
      let html = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        received += value.byteLength;
        if (received > MAX_BYTES) {
          abortController.abort();
          void reader.cancel().catch(() => undefined);
          throw new Error("Response too large");
        }

        html += decoder.decode(value, { stream: true });
      }

      html += decoder.decode();
      return { url: current, html };
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Too many redirects");
}

export async function fetchSiteMetadata(rawUrl: string): Promise<SiteMetadata> {
  const { url: finalUrl, html } = await safeFetchHtml(parseHttpUrl(rawUrl));
  const $ = load(html);

  const faviconCandidate =
    $('link[rel="icon"]').attr("href") ||
    $('link[rel="shortcut icon"]').attr("href") ||
    $('link[rel="apple-touch-icon"]').attr("href") ||
    "/favicon.ico";
  const favicon =
    resolveHttpAssetUrl(faviconCandidate, finalUrl) ||
    new URL("/favicon.ico", finalUrl).toString();

  const ogImageCandidate =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    "";
  const ogImage = resolveHttpAssetUrl(ogImageCandidate, finalUrl);

  const title =
    compactText(
      $('meta[property="og:title"]').attr("content") ||
        $("title").text() ||
        finalUrl.hostname,
      MAX_TITLE_LENGTH,
    ) || finalUrl.hostname;
  const description = compactText(
    $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "",
    MAX_DESCRIPTION_LENGTH,
  );

  return {
    favicon,
    ogImage,
    title,
    description,
    url: finalUrl.toString(),
  };
}
