"use client";

import Image from "next/image";
import { Suspense } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import Logo from "@/public/logo.svg";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  MobileDiscoveryDock,
  MobileDiscoverySearch,
} from "@/components/mobile-discovery";
import { directory } from "@/directory.config";

export const TopNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending: loading } = authClient.useSession();
  const user = session?.user ?? null;
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const tm = useTranslations("mobileDiscovery");

  const handleSignOut = async () => {
    await authClient.signOut();
    router.replace("/login");
  };

  const getAvatarUrl = (user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    id: string;
  }) => {
    if (user.image) {
      return user.image;
    }
    const name = user.name || user.email || user.id;
    return `https://source.boringavatars.com/beam/120/${encodeURIComponent(name)}?colors=264653,2a9d8f,e9c46a,f4a261,e76f51`;
  };

  const navItems = [
    { href: "/c", label: t("categories") },
    { href: "/collections", label: t("collections") },
    { href: "/about", label: t("about") },
    { href: "/open-source", label: t("openSource") },
    { href: "/submit", label: tc("submit") },
    { href: "/badge", label: t("badge"), isBadge: true },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex min-h-14 max-w-[1800px] items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:gap-6 lg:px-8 lg:py-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src={Logo}
              alt="Logo"
              width={120}
              height={50}
              className="h-7 w-auto sm:h-8"
            />
          </Link>

          {/* Navigation Items */}
          <div className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");

              if (item.isBadge) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Badge variant={isActive ? "default" : "outline"}>
                      {item.label}
                    </Badge>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Auth Buttons / User Menu */}
            {!loading &&
              (user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div
                      className="cursor-pointer"
                      onMouseEnter={(e) => {
                        const trigger = e.currentTarget.querySelector("button");
                        trigger?.click();
                      }}
                    >
                      <Button
                        variant="ghost"
                        className="relative h-8 w-8 rounded-full p-0"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={getAvatarUrl(user)}
                            alt={user.email || ""}
                          />
                          <AvatarFallback>
                            {user.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.name || "User"}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account">{tc("userCenter")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/publisher">
                        {tc("publisherDashboard")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/submit/status">{tc("mySubmissions")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      {tc("signOut")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/login">{tc("login")}</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/login">{tc("signUp")}</Link>
                  </Button>
                </div>
              ))}
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <Suspense
              fallback={<span aria-hidden="true" className="h-9 w-9" />}
            >
              <MobileDiscoverySearch />
            </Suspense>
            <LanguageSwitcher compact />
            <ThemeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button aria-label={tm("openMenu")} size="icon" variant="ghost">
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(86vw,22rem)] p-5">
                <SheetHeader className="pr-8 text-left">
                  <SheetTitle>{directory.name}</SheetTitle>
                  <SheetDescription>{tm("navigationLabel")}</SheetDescription>
                </SheetHeader>
                <div className="mt-8 grid gap-1">
                  <SheetClose asChild>
                    <Link
                      href="/"
                      className="rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      {tc("home")}
                    </Link>
                  </SheetClose>
                  {navItems.map((item) => (
                    <SheetClose key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-muted",
                          pathname === item.href ||
                            pathname.startsWith(item.href + "/")
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </div>
                <div aria-busy={loading} className="mt-6 border-t pt-4">
                  {loading ? (
                    <div
                      aria-hidden="true"
                      className="h-10 animate-pulse rounded-xl bg-muted"
                    />
                  ) : user ? (
                    <div className="grid gap-1">
                      <SheetClose asChild>
                        <Link
                          href="/account"
                          className="rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
                        >
                          {tc("userCenter")}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/account/publisher"
                          className="rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
                        >
                          {tc("publisherDashboard")}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/submit/status"
                          className="rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-muted"
                        >
                          {tc("mySubmissions")}
                        </Link>
                      </SheetClose>
                      <Button
                        className="mt-2 justify-start rounded-xl px-3"
                        onClick={handleSignOut}
                        variant="ghost"
                      >
                        {tc("signOut")}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <SheetClose asChild>
                        <Link
                          href="/login"
                          className="inline-flex h-10 items-center justify-center rounded-xl border text-sm font-medium transition-colors hover:bg-muted"
                        >
                          {tc("login")}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/login"
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                        >
                          {tc("signUp")}
                        </Link>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      <MobileDiscoveryDock />
    </>
  );
};
