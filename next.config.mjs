import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const isDevelopment = process.env.NODE_ENV === "development";

function configuredHttpOrigin(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ||
      (isDevelopment && url.protocol === "http:")
      ? url.origin
      : "";
  } catch {
    return "";
  }
}

const analyticsScriptSources = [
  process.env.NEXT_PUBLIC_GA_ID ? "https://www.googletagmanager.com" : "",
  configuredHttpOrigin(process.env.NEXT_PUBLIC_MATOMO_URL),
].filter(Boolean);
const analyticsConnectSources = [
  process.env.NEXT_PUBLIC_GA_ID ? "https://www.google-analytics.com" : "",
  process.env.NEXT_PUBLIC_GA_ID ? "https://analytics.google.com" : "",
  process.env.NEXT_PUBLIC_GA_ID ? "https://region1.google-analytics.com" : "",
  process.env.NEXT_PUBLIC_GA_ID ? "https://stats.g.doubleclick.net" : "",
  configuredHttpOrigin(process.env.NEXT_PUBLIC_MATOMO_URL),
].filter(Boolean);

/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: false,
  enablePrerenderSourceMaps: false,
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [{ protocol: "https", hostname: "**", pathname: "/**" }],
  },
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://cdn.jsdelivr.net ${analyticsScriptSources.join(" ")}`.trim(),
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://cdn.jsdelivr.net",
      "frame-src https://challenges.cloudflare.com",
      `connect-src 'self' https://challenges.cloudflare.com ${analyticsConnectSources.join(" ")}`.trim(),
      "object-src 'none'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  experimental: {
    sri: { algorithm: "sha384" },
    reactDebugChannel: false,
    serverSourceMaps: false,
    turbopackSourceMaps: false,
    staleTimes: { dynamic: 0, static: 180 },
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "@radix-ui/react-accordion",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-select",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "sonner",
    ],
  },
};

export default withNextIntl(nextConfig);
