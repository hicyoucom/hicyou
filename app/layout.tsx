import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import localFont from "next/font/local";

import { ThemeProvider } from "@/components/theme-provider";
import { Footer } from "@/components/footer";

import { directory } from "@/directory.config";

const font = localFont({
  src: [
    {
      path: "./fonts/GeistVF.woff",
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
      { url: '/favicon/favicon.ico' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: directory.title,
    description: directory.description,
    url: directory.baseUrl,
    siteName: directory.title,
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/ogimage.avif',
        width: 1200,
        height: 630,
        alt: directory.title,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: directory.title,
    description: directory.description,
    images: ['/ogimage.avif'],
  },
  manifest: '/favicon/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${font.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Footer />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

