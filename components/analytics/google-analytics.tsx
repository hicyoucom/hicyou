"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

const measurementId = process.env.NEXT_PUBLIC_GA_ID?.trim() || "";
const enabled =
  process.env.NODE_ENV === "production" && /^G-[A-Z0-9]+$/.test(measurementId);

function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (typeof window.gtag !== "function") return;
    const query = searchParams?.toString();
    const route = `${pathname}${query ? `?${query}` : ""}`;
    window.gtag("event", "page_view", {
      page_path: route,
      page_location: `${window.location.origin}${route}`,
      page_title: document.title,
    });
  }, [pathname, searchParams]);
  return null;
}

export function GoogleAnalytics() {
  if (!enabled) return null;
  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${measurementId}');`}
      </Script>
      <Suspense fallback={null}>
        <RouteTracker />
      </Suspense>
    </>
  );
}
