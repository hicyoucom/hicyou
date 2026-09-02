export const MOBILE_DISCOVERY_SEARCH_MAX_LENGTH = 120;

/**
 * Keeps mobile-search URLs compact and deterministic before they reach the
 * existing server-rendered directory search.
 */
export function normalizeMobileDiscoverySearch(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MOBILE_DISCOVERY_SEARCH_MAX_LENGTH);
}

export function getMobileDiscoverySearchHref(value: string): string {
  const search = normalizeMobileDiscoverySearch(value);
  if (!search) return "/";

  return `/?${new URLSearchParams({ search }).toString()}`;
}
