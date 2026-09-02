"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import {
  Compass,
  LayoutGrid,
  LibraryBig,
  LoaderCircle,
  Plus,
  Search,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  MOBILE_DISCOVERY_SEARCH_MAX_LENGTH,
  getMobileDiscoverySearchHref,
} from "@/lib/mobile-discovery";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;

function MobileDockLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      href={href}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function isDiscoveryPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/c" ||
    pathname.startsWith("/c/") ||
    pathname === "/tags" ||
    pathname.startsWith("/tags/") ||
    pathname === "/collections" ||
    pathname.startsWith("/collections/")
  );
}

export function MobileDiscoverySearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("mobileDiscovery");
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const navigateToSearch = React.useCallback(
    (value: string, replace = false) => {
      startTransition(() => {
        const href = getMobileDiscoverySearchHref(value);
        if (replace) {
          router.replace(href);
        } else {
          router.push(href);
        }
      });
    },
    [router, startTransition],
  );

  const debouncedNavigate = useDebouncedCallback(
    (value: string) => navigateToSearch(value, true),
    SEARCH_DEBOUNCE_MS,
  );

  React.useEffect(() => {
    return () => debouncedNavigate.cancel();
  }, [debouncedNavigate]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) debouncedNavigate.cancel();
    setOpen(nextOpen);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    debouncedNavigate.cancel();
    const formData = new FormData(event.currentTarget);
    setOpen(false);
    navigateToSearch(String(formData.get("search") ?? ""));
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button aria-label={t("openSearch")} size="icon" variant="ghost">
          <Search className="h-4 w-4" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="inset-x-0 bottom-0 top-auto max-h-[78svh] rounded-t-3xl px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 sm:inset-x-4 sm:bottom-4 sm:rounded-3xl"
        side="bottom"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchInputRef.current?.focus();
        }}
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle>{t("searchTitle")}</SheetTitle>
          <SheetDescription>{t("searchDescription")}</SheetDescription>
        </SheetHeader>
        <form className="mt-6" onSubmit={handleSubmit} role="search">
          <label className="sr-only" htmlFor="mobile-directory-search">
            {t("searchPlaceholder")}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              key={searchParams.get("search") ?? ""}
              ref={searchInputRef}
              autoComplete="off"
              className="h-12 rounded-2xl bg-muted/50 pl-11 pr-12 text-base shadow-none"
              defaultValue={searchParams.get("search") ?? ""}
              id="mobile-directory-search"
              maxLength={MOBILE_DISCOVERY_SEARCH_MAX_LENGTH}
              name="search"
              onChange={(event) => debouncedNavigate(event.currentTarget.value)}
              placeholder={t("searchPlaceholder")}
              type="search"
            />
            {isPending ? (
              <LoaderCircle
                className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary"
                aria-label={t("searching")}
              />
            ) : null}
          </div>
          <Button className="mt-3 w-full" type="submit">
            {t("openSearch")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function MobileDiscoveryDock() {
  const pathname = usePathname();
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const tMobile = useTranslations("mobileDiscovery");

  if (!isDiscoveryPath(pathname)) return null;

  return (
    <nav
      aria-label={tMobile("navigationLabel")}
      className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-border/80 bg-background/95 p-1.5 shadow-[0_18px_45px_-20px_hsl(var(--foreground)/0.5)] backdrop-blur lg:hidden"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      <MobileDockLink
        active={pathname === "/"}
        href="/"
        icon={Compass}
        label={t("home")}
      />
      <MobileDockLink
        active={
          pathname === "/c" ||
          pathname.startsWith("/c/") ||
          pathname === "/tags" ||
          pathname.startsWith("/tags/")
        }
        href="/c"
        icon={LayoutGrid}
        label={tNav("categories")}
      />
      <MobileDockLink
        active={
          pathname === "/collections" || pathname.startsWith("/collections/")
        }
        href="/collections"
        icon={LibraryBig}
        label={tNav("collections")}
      />
      <MobileDockLink
        active={pathname === "/submit"}
        href="/submit"
        icon={Plus}
        label={t("submit")}
      />
      <MobileDockLink
        active={pathname === "/account" || pathname.startsWith("/account/")}
        href="/account"
        icon={UserRound}
        label={t("userCenter")}
      />
    </nav>
  );
}
