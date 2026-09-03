import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ThemeProvider } from "@/components/theme-provider";
import { Footer } from "@/components/footer";
import { getFooterNavSites, localizedDescription } from "@/lib/friend-links";
import { routing } from "@/i18n/routing";
import { directory } from "@/directory.config";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { Matomo } from "@/components/analytics/matomo";
import { Toaster } from "@/components/ui/sonner";
import "../globals.css";

const font = localFont({
  src: [
    {
      path: "../fonts/GeistVF.woff",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-geist",
  display: "swap",
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  title: directory.title,
  description: directory.description,
  metadataBase: new URL(directory.baseUrl),
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: directory.title,
    description: directory.description,
    url: directory.baseUrl,
    siteName: directory.title,
    locale: "en_US",
    type: "website",
    images: [{
      url: new URL("/ogimage.avif", directory.baseUrl).toString(),
      width: 1200,
      height: 630,
      alt: directory.title,
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: directory.title,
    description: directory.description,
    images: [new URL("/ogimage.avif", directory.baseUrl).toString()],
  },
  manifest: "/favicon/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// Only namespaces consumed by client components (useTranslations) are shipped
// to the browser. Server components use getTranslations and don't need them.
const CLIENT_NAMESPACES = [
  "common",
  "nav",
  "footer",
  "auth",
  "submit",
  "badgePage",
  "language",
  "mobileDiscovery",
] as const;

type Messages = Record<string, unknown>;

function pickMessages(messages: Messages): Messages {
  const out: Messages = {};
  for (const ns of CLIENT_NAMESPACES) {
    if (ns in messages) out[ns] = messages[ns];
  }
  return out;
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = pickMessages(await getMessages());

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${font.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Footer
              navSites={getFooterNavSites().map((site) => ({
                ...site,
                description: localizedDescription(site, locale),
                descriptionI18n: null,
              }))}
            />
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
        <GoogleAnalytics />
        <Matomo />
      </body>
    </html>
  );
}
