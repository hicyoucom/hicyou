/**
 * Parses the explicitly trusted client-IP headers used by Better Auth.
 *
 * Better Auth intentionally rejects multi-hop X-Forwarded-For chains unless
 * every proxy is declared. Deployments behind a proxy that injects one
 * canonical client-IP header (such as Cloudflare's CF-Connecting-IP) should
 * opt in through BETTER_AUTH_IP_ADDRESS_HEADERS instead of trusting a broad
 * proxy range in application code.
 */
const HTTP_HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

export function parseTrustedAuthIpHeaders(
  rawValue: string | undefined,
): string[] | undefined {
  if (!rawValue) return undefined;

  const headers = new Set<string>();
  for (const candidate of rawValue.split(",")) {
    const header = candidate.trim().toLowerCase();
    if (header && HTTP_HEADER_NAME.test(header)) {
      headers.add(header);
    }
  }

  return headers.size > 0 ? [...headers] : undefined;
}

export function getTrustedAuthIpHeaders(): string[] | undefined {
  return parseTrustedAuthIpHeaders(
    process.env.BETTER_AUTH_IP_ADDRESS_HEADERS,
  );
}
