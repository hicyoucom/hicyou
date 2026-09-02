import { MetadataRoute } from "next";
import { directory } from "@/directory.config";
import { locales, defaultLocale } from "@/i18n/config";

// Robots rules change rarely; ISR keeps the response static at the edge.
export const revalidate = 86400;

export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["/hi-studio", "/account", "/login"];

  // Generate disallow rules for all locale variants
  const disallow = [
    "/api/",
    ...privatePaths,
    ...privatePaths.map((p) => `${p}/`),
    ...locales
      .filter((l) => l !== defaultLocale)
      .flatMap((l) => privatePaths.flatMap((p) => [`/${l}${p}`, `/${l}${p}/`])),
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${directory.baseUrl}/sitemap.xml`,
  };
}
