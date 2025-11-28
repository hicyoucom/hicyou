"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import Logo from "@/public/logo.svg";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
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

export const TopNav = () => {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const getAvatarUrl = (user: User) => {
    // 1. OAuth Avatar (Github/Google)
    if (user.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }

    // 2. Gravatar (if email available) - Note: Requires MD5, skipping for now to avoid deps if not present
    // If we had MD5: `https://www.gravatar.com/avatar/${md5(user.email)}?d=404`

    // 3. Boring Avatars (Fallback)
    const name = user.user_metadata?.full_name || user.email || user.id;
    return `https://source.boringavatars.com/beam/120/${encodeURIComponent(name)}?colors=264653,2a9d8f,e9c46a,f4a261,e76f51`;
  };

  const navItems = [
    { href: "/c", label: "Category" },
    { href: "/about", label: "About" },
    { href: "/pricing", label: "Pricing" },
    { href: "/submit", label: "Submit" },
    { href: "/badge", label: "Badge", isBadge: true },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center justify-between gap-6 px-8 py-4 max-w-[1800px] mx-auto">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <Image
            src={Logo}
            alt="Logo"
            width={120}
            height={50}
            className="w-auto h-8"
          />
        </Link>

        {/* Navigation Items */}
        <div className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            if (item.isBadge) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    isActive ? "text-primary" : "text-muted-foreground"
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
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Auth Buttons / User Menu */}
          {!loading && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      const trigger = e.currentTarget.querySelector('button');
                      trigger?.click();
                    }}
                  >
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={getAvatarUrl(user)} alt={user.email || ""} />
                        <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account">User Center</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account">My Submissions</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/login">Sign Up</Link>
                </Button>
              </div>
            )
          )}
        </div>
      </div>
    </nav>
  );
};

