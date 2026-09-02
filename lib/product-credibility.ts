/**
 * Public-facing facts about a directory record. These signals intentionally
 * describe HiCyou's stored listing only; they do not certify the external
 * product's security, ownership, availability, or quality.
 */
export type ProductCredibilityInput = {
  url: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  publishedAt: Date | null;
  overview: string | null;
  keyFeatures: unknown;
  useCases: unknown;
};

export type ProductCredibility = {
  recordDate: Date | null;
  recordDateKind: "published" | "created" | null;
  updatedAt: Date | null;
  listedDomain: string | null;
  hasOverview: boolean;
  keyFeatureCount: number;
  useCaseCount: number;
};

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function isNamedItem(value: unknown): value is { name: unknown } {
  return typeof value === "object" && value !== null && "name" in value;
}

/**
 * Normalizes only meaningful displayable items. Legacy key features can be
 * either strings or `{ name, description }` objects, while malformed JSON is
 * ignored. Reuse this at render boundaries so a legacy object never reaches a
 * React text child directly.
 */
export function getDisplayableListingItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim().length > 0) {
      return [item.trim()];
    }
    if (
      isNamedItem(item) &&
      typeof item.name === "string" &&
      item.name.trim().length > 0
    ) {
      return [item.name.trim()];
    }
    return [];
  });
}

/**
 * Counts only meaningful displayable listing items.
 */
export function countMeaningfulListingItems(value: unknown): number {
  return getDisplayableListingItems(value).length;
}

export function getListedDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }

    const hostname = parsed.hostname.replace(/^www\./i, "");
    return hostname || null;
  } catch {
    return null;
  }
}

export function getProductCredibility(
  product: ProductCredibilityInput,
): ProductCredibility {
  const publishedAt = isValidDate(product.publishedAt)
    ? product.publishedAt
    : null;
  const createdAt = isValidDate(product.createdAt) ? product.createdAt : null;

  return {
    recordDate: publishedAt ?? createdAt,
    recordDateKind: publishedAt ? "published" : createdAt ? "created" : null,
    updatedAt: isValidDate(product.updatedAt) ? product.updatedAt : null,
    listedDomain: getListedDomain(product.url),
    hasOverview:
      typeof product.overview === "string" &&
      product.overview.trim().length > 0,
    keyFeatureCount: countMeaningfulListingItems(product.keyFeatures),
    useCaseCount: countMeaningfulListingItems(product.useCases),
  };
}
