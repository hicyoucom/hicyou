import { Archive, ArrowUpRight, Star } from "lucide-react";

import { SafeExternalImage } from "@/components/safe-external-image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface BookmarkCardProps {
  bookmark: {
    id: number;
    url: string;
    title: string;
    description?: string | null;
    category?: {
      id: string;
      name: string;
      slug: string;
      color?: string;
      icon?: string;
    };
    favicon?: string | null;
    overview?: string | null;
    ogImage?: string | null;
    isArchived: boolean;
    isFavorite: boolean;
    isDofollow?: boolean;
    slug: string;
  };
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function BookmarkLogo({
  favicon,
  title,
  className,
}: {
  favicon?: string | null;
  title: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-white",
        className,
      )}
    >
      <span className="text-base font-semibold text-slate-400">
        {title.charAt(0).toUpperCase()}
      </span>
      <SafeExternalImage
        src={favicon}
        className="absolute inset-0 m-auto h-[58%] w-[58%] object-contain"
      />
    </span>
  );
}

export function BookmarkCard({ bookmark }: BookmarkCardProps) {
  const summary = bookmark.description || bookmark.overview;

  return (
    <Link
      href={`/${bookmark.slug}`}
      className={cn(
        "not-prose",
        "group block h-full touch-manipulation rounded-[1.25rem] border border-slate-200/90 bg-white p-2.5 shadow-[0_8px_28px_rgba(30,64,175,0.055)]",
        "transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_18px_42px_rgba(30,64,175,0.11)] active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "motion-reduce:transform-none motion-reduce:transition-none",
        "dark:border-white/10 dark:bg-slate-950 dark:hover:border-primary/35",
        bookmark.isArchived && "opacity-60 hover:opacity-100",
      )}
    >
      <article className="flex h-full flex-col">
        <div className="overflow-hidden rounded-[0.9rem] border border-slate-200/90 bg-slate-50 shadow-[0_5px_16px_rgba(30,64,175,0.07)] dark:border-white/10 dark:bg-slate-900">
          <div className="flex h-8 items-center gap-1.5 border-b border-slate-200/90 bg-slate-100 px-2.5 dark:border-white/10 dark:bg-slate-800">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400/70" />
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/70" />
            <span className="ml-1 min-w-0 flex-1 truncate rounded border border-slate-200/80 bg-white px-2 py-1 font-mono text-[8px] leading-none text-slate-400 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-500">
              {getHostname(bookmark.url)}
            </span>
          </div>

          <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-900">
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_72%_24%,rgba(255,255,255,0.95),transparent_25%),linear-gradient(145deg,#dce7ff,#f5f8ff)] dark:bg-[radial-gradient(circle_at_72%_24%,rgba(255,255,255,0.08),transparent_25%),linear-gradient(145deg,#18243a,#111827)]">
              <BookmarkLogo
                favicon={bookmark.favicon}
                title={bookmark.title}
                className="h-16 w-16 rounded-2xl border border-slate-200/80 shadow-[0_10px_28px_rgba(30,64,175,0.12)]"
              />
            </div>
            <SafeExternalImage
              src={bookmark.ogImage}
              className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
            />

            <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
              {bookmark.isFavorite ? (
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-white/90 text-amber-500 shadow-sm backdrop-blur-md"
                  aria-hidden="true"
                >
                  <Star className="h-3.5 w-3.5 fill-current" />
                </span>
              ) : null}
              {bookmark.isArchived ? (
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-white/90 text-slate-500 shadow-sm backdrop-blur-md"
                  aria-hidden="true"
                >
                  <Archive className="h-3.5 w-3.5" />
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex min-h-[8rem] items-start gap-2.5 px-1.5 pb-2 pt-4 sm:px-2.5">
          <BookmarkLogo
            favicon={bookmark.favicon}
            title={bookmark.title}
            className="h-10 w-10 rounded-[0.7rem] border border-slate-200 dark:border-white/10"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h3 className="line-clamp-1 flex-1 text-base font-semibold leading-6 tracking-[-0.025em] text-slate-950 dark:text-slate-50">
                {bookmark.title}
              </h3>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-primary transition-[color,background-color,border-color,transform] duration-300 group-hover:rotate-45 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground motion-reduce:transform-none motion-reduce:transition-none dark:border-blue-400/20 dark:bg-blue-400/10">
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>

            {summary ? (
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
                {summary}
              </p>
            ) : null}

            {bookmark.category ? (
              <span className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-slate-400"
                  style={{ backgroundColor: bookmark.category.color }}
                />
                {bookmark.category.name}
              </span>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  );
}
