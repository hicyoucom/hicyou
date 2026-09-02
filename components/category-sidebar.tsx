"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Home, Plus, User } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { cn } from "@/lib/utils";
import { DynamicIcon } from "@/lib/icon-utils";
import { useTranslations } from "next-intl";

export interface Category {
  id: string;
  name: string;
  slug: string;
  color?: string;
  icon?: string;
  groupKey?: string;
}

interface CategorySidebarProps {
  categories: Category[];
  currentCategorySlug?: string;
}

const SEARCH_DEBOUNCE_MS = 300;
const CATEGORY_GROUPS = [
  { key: "ai", label: "categoryGroupAi" },
  { key: "build", label: "categoryGroupBuild" },
  { key: "work", label: "categoryGroupWork" },
  { key: "growth", label: "categoryGroupGrowth" },
  { key: "life", label: "categoryGroupLife" },
  { key: "other", label: "categoryGroupOther" },
] as const;

function withSearchQuery(pathname: string, searchTerm: string | null): string {
  if (!searchTerm) return pathname;

  const params = new URLSearchParams({ search: searchTerm });
  return `${pathname}?${params.toString()}`;
}

export const CategorySidebar = ({
  categories,
  currentCategorySlug,
}: CategorySidebarProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("common");
  const tn = useTranslations("nav");
  const groupedCategories = CATEGORY_GROUPS.map((group) => ({
    ...group,
    categories: categories.filter(
      (category) => (category.groupKey ?? "other") === group.key,
    ),
  })).filter((group) => group.categories.length > 0);

  const getCategoryHref = (categorySlug: string | null) => {
    const pathname = categorySlug
      ? `/c/${encodeURIComponent(categorySlug)}`
      : "/";
    return withSearchQuery(pathname, searchParams.get("search"));
  };

  const handleSearch = useDebouncedCallback((term: string) => {
    startTransition(() => {
      const pathname = currentCategorySlug
        ? `/c/${encodeURIComponent(currentCategorySlug)}`
        : "/";
      router.push(withSearchQuery(pathname, term));
    });
  }, SEARCH_DEBOUNCE_MS);

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-56 flex-shrink-0 self-start border-r bg-background lg:flex lg:flex-col">
      {/* Search */}
      <div className="shrink-0 px-3 pb-5 pt-6">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            key={searchParams.get("search") ?? ""}
            type="search"
            defaultValue={searchParams.get("search") ?? ""}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder={`${t("search")}...`}
            className="h-10 rounded-lg border-slate-200 bg-slate-50 py-0 pl-9 pr-9 text-sm shadow-none placeholder:text-slate-400 focus-visible:border-primary/40 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary/15 dark:border-white/10 dark:bg-slate-900"
            aria-label={t("search")}
          />
          {isPending ? (
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <div
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/20 border-t-primary"
                aria-hidden="true"
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Categories */}
      <nav
        className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 pb-4"
        role="navigation"
        aria-label="Category navigation"
      >
        {/* All */}
        <Link
          href={getCategoryHref(null)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors",
            !currentCategorySlug
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-muted/50",
          )}
          aria-current={!currentCategorySlug ? "page" : undefined}
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{tn("allTools")}</span>
        </Link>

        {/* Grouped category list */}
        {groupedCategories.map((group) => (
          <div key={group.key} className="pt-3 first:pt-2">
            <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              {tn(group.label)}
            </p>
            <div className="space-y-0.5">
              {group.categories.map((category) => {
                const isActive = currentCategorySlug === category.slug;
                return (
                  <Link
                    key={category.id}
                    href={getCategoryHref(category.slug)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted/50",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {category.icon ? (
                      <DynamicIcon
                        name={category.icon}
                        className="h-4 w-4 flex-shrink-0"
                        aria-label={category.name}
                      />
                    ) : null}
                    <span className="flex-1 truncate">{category.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Submit Button */}
      <div className="shrink-0 space-y-2 border-t px-3 pb-6 pt-4">
        <Button asChild className="h-9 w-full gap-2 text-sm" variant="outline">
          <Link href="/submit">
            <Plus className="h-3.5 w-3.5" />
            {tn("submitTool")}
          </Link>
        </Button>
        <Button asChild className="h-9 w-full gap-2 text-sm" variant="outline">
          <Link href="/account">
            <User className="h-3.5 w-3.5" />
            {t("userCenter")}
          </Link>
        </Button>
      </div>
    </aside>
  );
};
