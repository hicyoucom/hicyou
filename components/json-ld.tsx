import { directory } from "@/directory.config";

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/<\/script/gi, "<\\/script"),
      }}
    />
  );
}

// ============ Schema Generators ============

export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: directory.name,
    url: directory.baseUrl,
    description: directory.description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${directory.baseUrl}/?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function generateBreadcrumbSchema(
  items: { name: string; url: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${directory.baseUrl}${item.url}`,
    })),
  };
}

export function generateSoftwareApplicationSchema(bookmark: {
  title: string;
  slug: string;
  description?: string | null;
  overview?: string | null;
  url: string;
  favicon?: string | null;
  ogImage?: string | null;
  pricingType?: string;
  category?: { name: string } | null;
  keyFeatures?: unknown;
  faqs?: unknown;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: bookmark.title,
    url: bookmark.url,
    description: bookmark.description || bookmark.overview || undefined,
    applicationCategory: bookmark.category?.name || "WebApplication",
    operatingSystem: "Web",
  };

  if (bookmark.ogImage) {
    schema.image = bookmark.ogImage;
  }
  if (bookmark.favicon) {
    schema.thumbnailUrl = bookmark.favicon;
  }

  if (bookmark.pricingType) {
    schema.offers = {
      "@type": "Offer",
      price: bookmark.pricingType === "Free" ? "0" : undefined,
      priceCurrency: "USD",
      availability: "https://schema.org/OnlineOnly",
    };
  }

  // These are HiCyou record timestamps, not claims about the external
  // application's original launch date or its current availability.
  const publishedAt = toIsoDate(bookmark.publishedAt);
  if (publishedAt) {
    schema.datePublished = publishedAt;
  }
  const updatedAt = toIsoDate(bookmark.updatedAt);
  if (updatedAt) {
    schema.dateModified = updatedAt;
  }

  // Add FAQ schema if available
  if (Array.isArray(bookmark.faqs) && bookmark.faqs.length > 0) {
    schema.mainEntity = {
      "@type": "FAQPage",
      mainEntity: (bookmark.faqs as { question: string; answer: string }[]).map(
        (faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        }),
      ),
    };
  }

  return schema;
}

function toIsoDate(value: Date | null | undefined): string | undefined {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    return undefined;
  }
  return value.toISOString();
}

export function generateItemListSchema(
  name: string,
  description: string,
  url: string,
  items: { title: string; slug: string; url: string; position: number }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description,
    url: `${directory.baseUrl}${url}`,
    numberOfItems: items.length,
    itemListElement: items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      name: item.title,
      url: `${directory.baseUrl}/${item.slug}`,
    })),
  };
}

export function generateCollectionPageSchema(collection: {
  title: string;
  slug: string;
  description?: string | null;
  coverImage?: string | null;
  publishedAt?: Date | null;
  bookmarks: { title: string; slug: string; url: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.title,
    description: collection.description || undefined,
    url: `${directory.baseUrl}/collections/${collection.slug}`,
    image: collection.coverImage || undefined,
    datePublished: collection.publishedAt?.toISOString() || undefined,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: collection.bookmarks.length,
      itemListElement: collection.bookmarks.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: b.title,
        url: `${directory.baseUrl}/${b.slug}`,
      })),
    },
  };
}
