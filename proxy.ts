import { locales } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import { isBot } from "@/lib/bot-detect";
import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);
const NOINDEX_PREFIXES = ["/api/", "/account", "/hi-studio", "/login"];

function matchesNoindexEntry(path: string, entry: string): boolean {
  if (entry.endsWith("/")) return path.startsWith(entry);
  return path === entry || path.startsWith(`${entry}/`);
}

function shouldNoindex(pathname: string, pathWithoutLocale: string): boolean {
  return NOINDEX_PREFIXES.some(
    (entry) =>
      matchesNoindexEntry(pathname, entry) ||
      matchesNoindexEntry(pathWithoutLocale, entry),
  );
}

function withNoindex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DEVELOPMENT_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);
const CSRF_EXEMPT_PREFIXES = [
  "/api/auth/", // Better Auth callbacks
  "/api/cron/", // Authenticated with CRON_SECRET
];

function getAllowedOrigins(): string[] {
  const configured = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.BETTER_AUTH_URL,
  ].filter((value): value is string => Boolean(value));
  return configured.map((value) => {
    try {
      return new URL(value).origin;
    } catch {
      return value;
    }
  });
}

function isAllowedDevelopmentOrigin(origin: string): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  try {
    return DEVELOPMENT_HOSTNAMES.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function safeOrigin(refererOrUrl: string): string | null {
  try {
    return new URL(refererOrUrl).origin;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/api/") &&
    MUTATING_METHODS.has(request.method) &&
    !CSRF_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const sourceOrigin = origin ?? (referer ? safeOrigin(referer) : null);
    const allowed = new Set([request.nextUrl.origin, ...getAllowedOrigins()]);
    if (
      !sourceOrigin ||
      (!allowed.has(sourceOrigin) && !isAllowedDevelopmentOrigin(sourceOrigin))
    ) {
      return withNoindex(
        NextResponse.json({ error: "Forbidden: bad origin" }, { status: 403 }),
      );
    }
  }

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/llms.txt" ||
    pathname === "/llms-full.txt" ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|woff|woff2)$/)
  ) {
    const passthrough = NextResponse.next();
    if (pathname.startsWith("/api/")) {
      passthrough.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return passthrough;
  }

  const pathSegments = pathname.split("/").filter(Boolean);
  const localeCandidate = pathSegments[0];
  const pathLocale =
    localeCandidate && locales.some((locale) => locale === localeCandidate)
      ? localeCandidate
      : null;
  const pathWithoutLocale = pathLocale
    ? `/${pathSegments.slice(1).join("/")}`
    : pathname;

  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");
  const hasSession = Boolean(sessionCookie?.value);
  const protectedPaths = ["/hi-studio", "/account", "/submit/status"];
  const isProtected = protectedPaths.some((protectedPath) =>
    matchesNoindexEntry(pathWithoutLocale, protectedPath),
  );

  if (isProtected && !hasSession) {
    const loginUrl = pathLocale
      ? new URL(`/${pathLocale}/login`, request.url)
      : new URL("/login", request.url);
    return withNoindex(NextResponse.redirect(loginUrl));
  }

  const userAgent = request.headers.get("user-agent");
  let intlRequest: NextRequest = request;
  if (isBot(userAgent)) {
    const headers = new Headers(request.headers);
    headers.delete("accept-language");
    intlRequest = new NextRequest(request, { headers });
  }

  const response = intlMiddleware(intlRequest);
  if (shouldNoindex(pathname, pathWithoutLocale)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|llms.txt|llms-full.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|woff|woff2)$).*)",
  ],
};
