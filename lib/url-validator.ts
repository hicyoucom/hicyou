/**
 * URL validation utilities shared by URL-first submission and server-side
 * metadata fetching. All server fetches must pass this module first.
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const URL_SCHEME_RE = /^[a-z][a-z\d+.-]*:/i;

export class UrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlValidationError";
  }
}

type HostAddress = { address: string };

export type HostAddressResolver = (
  hostname: string,
) => Promise<readonly HostAddress[]>;

function stripIpv6Brackets(value: string): string {
  return value.startsWith("[") && value.endsWith("]")
    ? value.slice(1, -1)
    : value;
}

function toUrlInput(rawUrl: unknown): string {
  if (typeof rawUrl !== "string") {
    throw new UrlValidationError("A website URL is required");
  }

  const value = rawUrl.trim();
  if (!value) {
    throw new UrlValidationError("A website URL is required");
  }

  if (value.startsWith("//")) {
    return "https:" + value;
  }

  return URL_SCHEME_RE.test(value) ? value : "https://" + value;
}

/**
 * Parses a user-provided public web URL without performing DNS I/O.
 *
 * It intentionally accepts a bare hostname and adds https://, but rejects
 * credentials and non-web schemes before callers can store or fetch it.
 */
export function parseHttpUrl(rawUrl: unknown): URL {
  let url: URL;
  try {
    url = new URL(toUrlInput(rawUrl));
  } catch {
    throw new UrlValidationError("Invalid URL format");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlValidationError("Only HTTP and HTTPS URLs are allowed");
  }

  if (!url.hostname) {
    throw new UrlValidationError("A website hostname is required");
  }

  if (url.username || url.password) {
    throw new UrlValidationError("URLs with credentials are not allowed");
  }

  return url;
}

/**
 * Canonical form used for submission deduplication and preflight checks.
 * URL's serializer lowercases hostnames and removes default ports for us.
 */
export function normalizeHttpUrl(rawUrl: unknown): string {
  const url = parseHttpUrl(rawUrl);
  url.hash = "";
  url.searchParams.sort();

  const normalized = url.toString();
  return url.pathname === "/" && !url.search
    ? normalized.slice(0, -1)
    : normalized;
}

function isBlockedIpv4(ip: string): boolean {
  const octets = ip.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return true;
  }

  const [first, second, third] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 &&
      (second === 168 || (second === 0 && (third === 0 || third === 2)))) ||
    // 192.88.99.0/24 was formerly used for 6to4 relay anycast and is not
    // public destination space for application fetches.
    (first === 192 && second === 88 && third === 99) ||
    (first === 198 &&
      (second === 18 || second === 19 || (second === 51 && third === 100))) ||
    (first === 203 && second === 0 && third === 113)
  );
}

function isBlockedIpv6(ip: string): boolean {
  const hextets = ip.split(":").filter(Boolean);
  const firstHextet = hextets[0] ?? "0";
  const firstHextetNumber = Number.parseInt(firstHextet, 16);
  const secondHextetNumber = Number.parseInt(hextets[1] ?? "", 16);

  // Publicly routable global-unicast IPv6 currently lives in 2000::/3. A
  // conservative allowlist blocks loopback, unspecified, link-local, ULA,
  // IPv4-mapped and documentation ranges without a fragile regex catalogue.
  return (
    !Number.isFinite(firstHextetNumber) ||
    firstHextetNumber < 0x2000 ||
    firstHextetNumber > 0x3fff ||
    // 2001:0::/32 (Teredo) and 2002::/16 (6to4) tunnel IPv6 over IPv4.
    // Rejecting them prevents alternate encodings from bypassing IPv4 policy.
    (firstHextetNumber === 0x2001 && secondHextetNumber === 0x0000) ||
    firstHextetNumber === 0x2002 ||
    // 2001:db8::/32 is reserved for documentation and never publicly routed.
    (firstHextetNumber === 0x2001 && secondHextetNumber === 0x0db8)
  );
}

/**
 * Returns true for addresses that must never be contacted by a server-side
 * fetcher. Unknown/non-IP input is blocked rather than treated as public.
 */
export function isBlockedIp(rawIp: string): boolean {
  const ip = stripIpv6Brackets(rawIp).toLowerCase();
  const family = isIP(ip);

  if (family === 4) {
    return isBlockedIpv4(ip);
  }

  if (family === 6) {
    return isBlockedIpv6(ip);
  }

  return true;
}

async function resolveHost(hostname: string): Promise<readonly HostAddress[]> {
  return lookup(hostname, { all: true, verbatim: true });
}

/**
 * Validates a URL immediately before a server-side fetch. Every DNS answer
 * must be public: accepting one public record alongside an internal record
 * leaves address selection to the HTTP client and re-opens SSRF. This is a
 * request-layer control; production should also restrict outbound access to
 * private networks to defend against connection-time DNS rebinding.
 */
export async function validateUrlForFetch(
  rawUrl: unknown,
  resolver: HostAddressResolver = resolveHost,
): Promise<URL> {
  const url = new URL(normalizeHttpUrl(rawUrl));
  if (url.port) {
    throw new UrlValidationError(
      "Only default HTTP and HTTPS ports are allowed for metadata fetching",
    );
  }
  const hostname = stripIpv6Brackets(url.hostname);

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new UrlValidationError(
        "Requests to private or non-public networks are not allowed",
      );
    }
    return url;
  }

  let addresses: readonly HostAddress[];
  try {
    addresses = await resolver(hostname);
  } catch {
    throw new UrlValidationError("URL host could not be resolved");
  }

  if (
    addresses.length === 0 ||
    addresses.some((address) => isBlockedIp(address.address))
  ) {
    throw new UrlValidationError(
      "Requests to private or non-public networks are not allowed",
    );
  }

  return url;
}
