import {
  request as httpRequest,
  type IncomingMessage,
  type RequestOptions as HttpRequestOptions,
} from "node:http";
import {
  request as httpsRequest,
  type RequestOptions as HttpsRequestOptions,
} from "node:https";
import { isIP } from "node:net";
import { Readable } from "node:stream";

import {
  resolveUrlForFetch,
  type HostAddressResolver,
  type ResolvedPublicUrl,
} from "@/lib/url-validator";

export type PublicHttpRequestInit = {
  method?: string;
  headers?: HeadersInit;
  body?: string | Uint8Array;
  signal?: AbortSignal;
};

export type PublicHttpTransport = (
  target: ResolvedPublicUrl,
  init: PublicHttpRequestInit,
) => Promise<Response>;

type PublicHttpDependencies = {
  resolver?: HostAddressResolver;
  transport?: PublicHttpTransport;
};

function headersFromIncomingMessage(message: IncomingMessage): Headers {
  const headers = new Headers();
  for (let index = 0; index < message.rawHeaders.length; index += 2) {
    headers.append(message.rawHeaders[index], message.rawHeaders[index + 1]);
  }
  return headers;
}

function responseFromIncomingMessage(
  message: IncomingMessage,
  method: string,
): Response {
  const status = message.statusCode;
  if (!status || status < 200 || status > 599) {
    message.destroy();
    throw new Error("Upstream returned an unsupported HTTP status");
  }

  const bodyless =
    method === "HEAD" || status === 204 || status === 205 || status === 304;
  if (bodyless) message.resume();

  return new Response(
    bodyless
      ? null
      : (Readable.toWeb(message) as unknown as ReadableStream<Uint8Array>),
    {
      status,
      statusText: message.statusMessage,
      headers: headersFromIncomingMessage(message),
    },
  );
}

/**
 * Builds Node request options that connect to a vetted address while keeping
 * the original hostname for HTTP routing and TLS certificate verification.
 */
export function createPinnedRequestOptions(
  target: ResolvedPublicUrl,
  address: ResolvedPublicUrl["addresses"][number],
  init: PublicHttpRequestInit = {},
): HttpsRequestOptions {
  const headers = new Headers(init.headers);
  headers.set("host", target.url.host);
  if (
    init.body !== undefined &&
    !headers.has("content-length") &&
    !headers.has("transfer-encoding")
  ) {
    headers.set(
      "content-length",
      String(
        typeof init.body === "string"
          ? Buffer.byteLength(init.body)
          : init.body.byteLength,
      ),
    );
  }

  const originalHostname = target.url.hostname.replace(/^\[|\]$/g, "");
  return {
    agent: false,
    family: address.family,
    headers: Object.fromEntries(headers.entries()),
    hostname: address.address,
    method: (init.method ?? "GET").toUpperCase(),
    path: `${target.url.pathname}${target.url.search}`,
    port: target.url.protocol === "https:" ? 443 : 80,
    servername:
      target.url.protocol === "https:" && isIP(originalHostname) === 0
        ? originalHostname
        : undefined,
    setHost: false,
    signal: init.signal,
  };
}

function requestAddress(
  target: ResolvedPublicUrl,
  address: ResolvedPublicUrl["addresses"][number],
  init: PublicHttpRequestInit,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const method = (init.method ?? "GET").toUpperCase();
    const options = createPinnedRequestOptions(target, address, init);
    const request = (
      target.url.protocol === "https:" ? httpsRequest : httpRequest
    )(options as HttpRequestOptions, (message) => {
      try {
        resolve(responseFromIncomingMessage(message, method));
      } catch (error) {
        reject(error);
      }
    });
    request.once("error", reject);
    request.end(init.body);
  });
}

async function pinnedNodeTransport(
  target: ResolvedPublicUrl,
  init: PublicHttpRequestInit,
): Promise<Response> {
  let lastError: unknown;
  for (const address of target.addresses) {
    try {
      return await requestAddress(target, address, init);
    } catch (error) {
      lastError = error;
      if (init.signal?.aborted) throw error;
    }
  }
  throw lastError ?? new Error("No validated address was available");
}

/**
 * Fetches a public HTTP(S) URL without a validation/connection DNS race. The
 * resolver runs once, every answer must be public, and the transport connects
 * directly to one of those exact addresses. Redirects are intentionally left
 * to callers so each hop is independently validated and pinned.
 */
export async function fetchPublicHttpUrl(
  rawUrl: string | URL,
  init: PublicHttpRequestInit = {},
  dependencies: PublicHttpDependencies = {},
): Promise<Response> {
  const target = await resolveUrlForFetch(
    rawUrl.toString(),
    dependencies.resolver,
  );
  return (dependencies.transport ?? pinnedNodeTransport)(target, init);
}

export type PublicHttpFetcher = typeof fetchPublicHttpUrl;
