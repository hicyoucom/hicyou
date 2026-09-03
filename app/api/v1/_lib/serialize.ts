// Pure DB-row → public Product transform. Field WHITELIST: only the fields
// listed here are ever emitted — internal columns (notes, search_results,
// isFavorite, lastVisited, …) must never leak.
import type { KeyFeature, Faq } from "@/db/schema";

export type ProductTranslations = Record<string, Record<string, string>>; // locale -> field -> value

export interface SerializeInput {
  id: number;
  slug: string;
  url: string;
  title: string;
  description: string | null;
  overview: string | null;
  favicon: string | null;
  screenshot: string | null;
  ogImage: string | null;
  pricingType: string | null;
  isDofollow: boolean;
  category: { slug: string; name: string } | null;
  categories: Array<{ slug: string; name: string; primary: boolean }>;
  tags: string[];
  alternatives: string | null;
  keyFeatures: KeyFeature[] | null;
  useCases: string[] | null;
  faqs: Faq[] | null;
  whyStartups: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  translations?: ProductTranslations;
}

export interface SerializeOptions {
  include?: Set<string>; // alternatives | key_features | faqs | use_cases | tags
}

export interface Product {
  slug: string;
  domain: string | null;
  url: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  screenshot_url: string | null;
  og_image_url: string | null;
  pricing_model: string;
  is_dofollow: boolean;
  category: { slug: string; name: string } | null;
  categories: Array<{ slug: string; name: string; primary: boolean }>;
  tags: string[];
  alternatives?: string[];
  key_features?: KeyFeature[];
  use_cases?: string[];
  faqs?: Faq[];
  why_startups?: string | null;
  i18n?: ProductTranslations;
  published_at: string | null;
  updated_at: string;
  deleted_at: string | null;
  source: "hicyou";
  source_id: number; // stable consumer key; slugs may be renamed
}

export function domainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function iso(d: Date | null): string | null {
  return d ? new Date(d).toISOString() : null;
}

export function serializeProduct(row: SerializeInput, opts: SerializeOptions = {}): Product {
  const include = opts.include ?? new Set<string>();

  const product: Product = {
    slug: row.slug,
    domain: domainFromUrl(row.url),
    url: row.url,
    name: row.title,
    tagline: row.description,
    description: row.overview,
    logo_url: row.favicon,
    screenshot_url: row.screenshot,
    og_image_url: row.ogImage,
    pricing_model: (row.pricingType ?? "").toLowerCase() || "unknown",
    is_dofollow: row.isDofollow,
    category: row.category,
    categories: row.categories,
    tags: row.tags ?? [],
    published_at: iso(row.publishedAt ?? row.createdAt),
    updated_at: iso(row.updatedAt)!,
    deleted_at: iso(row.deletedAt),
    source: "hicyou",
    source_id: row.id,
  };

  if (include.has("alternatives")) {
    product.alternatives = (row.alternatives ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (include.has("key_features")) product.key_features = row.keyFeatures ?? [];
  if (include.has("use_cases")) product.use_cases = row.useCases ?? [];
  if (include.has("faqs")) product.faqs = row.faqs ?? [];
  if (include.has("alternatives") || include.has("key_features")) {
    product.why_startups = row.whyStartups ?? null;
  }
  if (row.translations && Object.keys(row.translations).length > 0) {
    product.i18n = row.translations;
  }

  return product;
}

export function parseInclude(raw: string | null): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}
