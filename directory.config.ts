const configuredBaseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const directory = {
  baseUrl: configuredBaseUrl.replace(/\/$/, ""),
  name: process.env.NEXT_PUBLIC_SITE_NAME || "HiCyou",
  title: `${process.env.NEXT_PUBLIC_SITE_NAME || "HiCyou"} | Open-source directory platform`,
  description:
    "A self-hosted, multilingual directory for software products and online resources.",
};
