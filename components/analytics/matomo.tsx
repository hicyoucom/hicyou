"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

function configuredBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_MATOMO_URL?.trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/?$/, "/");
  } catch {
    return "";
  }
}

const baseUrl = configuredBaseUrl();
const siteId = process.env.NEXT_PUBLIC_MATOMO_SITE_ID?.trim() || "";
const enabled =
  process.env.NODE_ENV === "production" && !!baseUrl && /^\d+$/.test(siteId);

function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const first = useRef(true);
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const query = searchParams?.toString();
    const route = `${pathname}${query ? `?${query}` : ""}`;
    if (first.current) {
      first.current = false;
      previous.current = route;
      return;
    }
    const queue = (window._paq = window._paq || []);
    if (previous.current)
      queue.push([
        "setReferrerUrl",
        `${window.location.origin}${previous.current}`,
      ]);
    queue.push(["setCustomUrl", `${window.location.origin}${route}`]);
    queue.push(["setDocumentTitle", document.title]);
    queue.push(["deleteCustomVariables", "page"]);
    queue.push(["trackPageView"]);
    queue.push(["enableLinkTracking"]);
    previous.current = route;
  }, [pathname, searchParams]);
  return null;
}

export function Matomo() {
  if (!enabled) return null;
  return (
    <>
      <Script id="matomo" strategy="afterInteractive">
        {`var _paq=window._paq=window._paq||[];_paq.push(['setTrackerUrl','${baseUrl}matomo.php']);_paq.push(['setSiteId','${siteId}']);_paq.push(['disableCookies']);_paq.push(['enableLinkTracking']);_paq.push(['trackPageView']);(function(){var d=document,g=d.createElement('script'),s=d.getElementsByTagName('script')[0];g.async=true;g.src='${baseUrl}matomo.js';s.parentNode.insertBefore(g,s)})();`}
      </Script>
      <Suspense fallback={null}>
        <RouteTracker />
      </Suspense>
    </>
  );
}
