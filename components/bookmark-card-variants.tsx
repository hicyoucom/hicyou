import { ArrowUpRight, CircleCheck, Layers3, Star } from "lucide-react";

import { BookmarkCard } from "@/components/bookmark-card";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface CardStyleBookmark {
  id: number;
  url: string;
  title: string;
  slug: string;
  description?: string | null;
  overview?: string | null;
  favicon?: string | null;
  ogImage?: string | null;
  isFavorite?: boolean;
  category?: {
    name: string;
    slug: string;
    color?: string | null;
  } | null;
}

interface CardStyleVariantsProps {
  bookmarks: CardStyleBookmark[];
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getSummary(bookmark: CardStyleBookmark) {
  return (
    bookmark.description ||
    bookmark.overview ||
    "值得收藏的优质网站与数字工具。"
  );
}

function Logo({
  bookmark,
  className,
}: {
  bookmark: CardStyleBookmark;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-white",
        className,
      )}
    >
      {bookmark.favicon ? (
        // Arbitrary publisher favicons cannot be safely enumerated for next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bookmark.favicon}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-[58%] w-[58%] object-contain"
        />
      ) : (
        <span className="text-lg font-bold text-slate-400">
          {bookmark.title.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

function OptionHeading({
  label,
  title,
  description,
  tone,
}: {
  label: string;
  title: string;
  description: string;
  tone: string;
}) {
  return (
    <div className="mb-7 grid gap-4 border-t border-foreground/15 pt-5 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)] sm:items-end">
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            tone,
          )}
        >
          {label}
        </span>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
          {title}
        </h2>
      </div>
      <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:justify-self-end sm:text-right">
        {description}
      </p>
    </div>
  );
}

function PrecisionCard({ bookmark }: { bookmark: CardStyleBookmark }) {
  return (
    <Link
      href={`/${bookmark.slug}`}
      className="group relative flex min-h-56 flex-col overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_18px_45px_rgba(30,64,175,0.10)] dark:border-white/10 dark:bg-slate-950"
    >
      <div className="flex items-start justify-between gap-4">
        <Logo
          bookmark={bookmark}
          className="h-12 w-12 rounded-[0.9rem] border border-slate-200 shadow-sm"
        />
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white dark:border-white/10">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-7">
        <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-blue-600">
          {getHostname(bookmark.url)}
        </p>
        <h3 className="text-xl font-semibold tracking-[-0.035em] text-slate-950 dark:text-white">
          {bookmark.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {getSummary(bookmark)}
        </p>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-6 text-xs font-medium text-slate-500">
        <span
          className="h-1.5 w-1.5 rounded-full bg-blue-500"
          style={{ backgroundColor: bookmark.category?.color || undefined }}
        />
        {bookmark.category?.name || "精选工具"}
        {bookmark.isFavorite ? (
          <Star className="ml-auto h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        ) : null}
      </div>
    </Link>
  );
}

function CanvasCard({ bookmark }: { bookmark: CardStyleBookmark }) {
  return (
    <Link
      href={`/${bookmark.slug}`}
      className="group block overflow-hidden rounded-[1.6rem] bg-[#151515] text-white shadow-[0_20px_55px_rgba(15,23,42,0.15)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#d8ddff]">
        {bookmark.ogImage ? (
          // Arbitrary publisher images cannot be safely enumerated for next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bookmark.ogImage}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_18%,rgba(255,255,255,0.9),transparent_22%),linear-gradient(135deg,#bed0ff_0%,#ddd8ff_48%,#ffdfc9_100%)]">
            <span className="absolute -bottom-9 -right-2 text-[9rem] font-black leading-none text-white/45">
              {bookmark.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <Logo
          bookmark={bookmark}
          className="absolute bottom-4 left-4 h-14 w-14 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
        />
        <span className="absolute right-4 top-4 rounded-full bg-black/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] backdrop-blur-md">
          {bookmark.category?.name || "Curated"}
        </span>
      </div>

      <div className="relative p-5 pb-6">
        <ArrowUpRight className="absolute right-5 top-5 h-5 w-5 text-white/50 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
        <h3 className="pr-8 text-xl font-semibold tracking-[-0.035em]">
          {bookmark.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/60">
          {getSummary(bookmark)}
        </p>
      </div>
    </Link>
  );
}

function LedgerRow({
  bookmark,
  index,
}: {
  bookmark: CardStyleBookmark;
  index: number;
}) {
  return (
    <Link
      href={`/${bookmark.slug}`}
      className="group grid gap-4 border-b border-stone-300 py-6 transition-colors hover:bg-[#f1ece2] dark:border-stone-700 dark:hover:bg-stone-900 sm:grid-cols-[3rem_3.5rem_minmax(0,1fr)_10rem_2rem] sm:items-center sm:px-3"
    >
      <span className="font-mono text-xs text-stone-400">
        {String(index + 1).padStart(2, "0")}
      </span>
      <Logo
        bookmark={bookmark}
        className="h-12 w-12 rounded-none border border-stone-300"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-serif text-xl font-medium tracking-[-0.025em] text-stone-900 dark:text-stone-100 sm:text-2xl">
            {bookmark.title}
          </h3>
          {bookmark.isFavorite ? (
            <span className="text-[10px] text-orange-600">★</span>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-stone-500">
          {getSummary(bookmark)}
        </p>
      </div>
      <div className="hidden sm:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
          Collection
        </p>
        <p className="mt-1 truncate text-sm text-stone-700 dark:text-stone-300">
          {bookmark.category?.name || "精选工具"}
        </p>
      </div>
      <ArrowUpRight className="hidden h-4 w-4 text-stone-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-orange-600 sm:block" />
    </Link>
  );
}

function DockCard({ bookmark }: { bookmark: CardStyleBookmark }) {
  return (
    <Link
      href={`/${bookmark.slug}`}
      className="group relative flex min-h-64 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0b1019] p-5 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-emerald-400/50"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-center justify-between border-b border-white/10 pb-4 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Online
        </span>
        <span>{getHostname(bookmark.url)}</span>
      </div>

      <div className="mt-6 flex items-start gap-4">
        <Logo
          bookmark={bookmark}
          className="h-14 w-14 rounded-md border border-white/10"
        />
        <div className="min-w-0 pt-0.5">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-400">
            {bookmark.category?.name || "Utility"}
          </p>
          <h3 className="truncate text-xl font-semibold tracking-[-0.035em]">
            {bookmark.title}
          </h3>
        </div>
      </div>

      <p className="mt-5 line-clamp-2 text-sm leading-6 text-slate-400">
        {getSummary(bookmark)}
      </p>

      <div className="mt-auto flex items-center justify-between pt-7">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
          <CircleCheck className="h-3.5 w-3.5 text-emerald-400" />
          Curated
        </span>
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-300 transition-colors group-hover:text-emerald-300">
          Open tool
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function BentoCard({
  bookmark,
  featured = false,
}: {
  bookmark: CardStyleBookmark;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/${bookmark.slug}`}
      className={cn(
        "group relative flex min-h-60 overflow-hidden rounded-[1.75rem] bg-[#e9eef8] text-slate-950",
        featured
          ? "flex-col md:col-span-2 xl:row-span-2 xl:min-h-[31rem]"
          : "items-end xl:col-span-2",
      )}
    >
      {bookmark.ogImage ? (
        // Arbitrary publisher images cannot be safely enumerated for next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bookmark.ogImage}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]",
            !featured && "opacity-35 mix-blend-multiply",
          )}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,#ffffff_0%,transparent_24%),linear-gradient(145deg,#dfe8ff_0%,#f5e7d5_100%)]" />
      )}
      <div
        className={cn(
          "absolute inset-0",
          featured
            ? "bg-gradient-to-t from-slate-950/90 via-slate-950/5 to-transparent"
            : "bg-gradient-to-r from-[#edf3ff] via-[#edf3ff]/95 to-transparent",
        )}
      />

      <span className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-slate-800 backdrop-blur-md transition-transform duration-300 group-hover:rotate-45">
        <ArrowUpRight className="h-4 w-4" />
      </span>

      <div
        className={cn(
          "relative z-10 p-6",
          featured ? "mt-auto text-white sm:p-8" : "max-w-[78%]",
        )}
      >
        <div className="mb-4 flex items-center gap-3">
          <Logo
            bookmark={bookmark}
            className="h-11 w-11 rounded-xl shadow-sm"
          />
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.16em]",
              featured ? "text-white/60" : "text-slate-500",
            )}
          >
            {bookmark.category?.name || "Featured"}
          </span>
        </div>
        <h3
          className={cn(
            "font-semibold tracking-[-0.05em]",
            featured ? "text-3xl sm:text-5xl" : "text-2xl",
          )}
        >
          {bookmark.title}
        </h3>
        <p
          className={cn(
            "mt-3 line-clamp-2 max-w-xl text-sm leading-6",
            featured ? "text-white/70 sm:text-base" : "text-slate-600",
          )}
        >
          {getSummary(bookmark)}
        </p>
      </div>
    </Link>
  );
}

const softCardTones = [
  "bg-[#f3e9ff] text-[#40245d]",
  "bg-[#dff5e8] text-[#173f2c]",
  "bg-[#fff0d9] text-[#563616]",
];

function SoftCard({
  bookmark,
  index,
}: {
  bookmark: CardStyleBookmark;
  index: number;
}) {
  return (
    <Link
      href={`/${bookmark.slug}`}
      className={cn(
        "group relative flex min-h-[19rem] flex-col overflow-hidden rounded-[2.5rem] p-6 transition-transform duration-300 hover:-translate-y-1.5 sm:p-7",
        softCardTones[index % softCardTones.length],
      )}
    >
      <span className="absolute -right-12 -top-12 h-40 w-40 rounded-full border-[28px] border-white/30 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110" />
      <span className="absolute bottom-16 right-8 h-5 w-5 rounded-full bg-current opacity-10" />
      <div className="relative flex items-center justify-between">
        <Logo
          bookmark={bookmark}
          className="h-14 w-14 rounded-[1.25rem] shadow-[0_8px_24px_rgba(76,51,107,0.10)]"
        />
        <span className="rounded-full bg-white/55 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
          {bookmark.category?.name || "Discover"}
        </span>
      </div>

      <div className="relative mt-8">
        <h3 className="text-2xl font-semibold tracking-[-0.045em]">
          {bookmark.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 opacity-65">
          {getSummary(bookmark)}
        </p>
      </div>

      <div className="relative mt-auto flex items-center justify-between pt-6 text-xs font-semibold">
        <span className="opacity-55">{getHostname(bookmark.url)}</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 transition-transform group-hover:translate-x-1">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

const brutalCardTones = ["bg-[#ff5c35]", "bg-[#ffdf38]", "bg-[#57d7ef]"];

function BrutalCard({
  bookmark,
  index,
}: {
  bookmark: CardStyleBookmark;
  index: number;
}) {
  return (
    <Link
      href={`/${bookmark.slug}`}
      className={cn(
        "group flex min-h-[18rem] flex-col border-[3px] border-black p-5 text-black shadow-[7px_7px_0_#111] transition-[transform,box-shadow] hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0_#111]",
        brutalCardTones[index % brutalCardTones.length],
      )}
    >
      <div className="flex items-start justify-between border-b-[3px] border-black pb-4">
        <span className="bg-black px-2.5 py-1 font-mono text-[11px] font-bold text-white">
          WEB—{String(index + 1).padStart(2, "0")}
        </span>
        <ArrowUpRight className="h-6 w-6 stroke-[2.5] transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
      </div>

      <div className="mt-5 flex items-center gap-4">
        <Logo
          bookmark={bookmark}
          className="h-14 w-14 rounded-none border-[3px] border-black"
        />
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
          {bookmark.category?.name || "Internet resource"}
        </p>
      </div>

      <h3 className="mt-6 break-words text-3xl font-black uppercase leading-[0.92] tracking-[-0.06em] sm:text-4xl">
        {bookmark.title}
      </h3>
      <p className="mt-auto line-clamp-2 border-t-2 border-black/25 pt-4 text-sm font-medium leading-5">
        {getSummary(bookmark)}
      </p>
    </Link>
  );
}

function SpotlightCard({
  bookmark,
  index,
}: {
  bookmark: CardStyleBookmark;
  index: number;
}) {
  return (
    <Link
      href={`/${bookmark.slug}`}
      className="group relative flex min-h-[24rem] flex-col overflow-hidden border-t border-black/20 py-6 dark:border-white/20 sm:px-2"
    >
      <span className="pointer-events-none absolute right-0 top-0 font-serif text-[10rem] leading-none tracking-[-0.09em] text-black/[0.035] transition-colors group-hover:text-black/[0.07] dark:text-white/[0.035] dark:group-hover:text-white/[0.07] sm:text-[13rem]">
        {index + 1}
      </span>

      <div className="relative flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {bookmark.category?.name || "Selected work"}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          0{index + 1} / 03
        </span>
      </div>

      <div className="relative mt-auto">
        <Logo
          bookmark={bookmark}
          className="mb-7 h-12 w-12 rounded-full border border-black/10 dark:border-white/10"
        />
        <h3 className="max-w-[90%] text-4xl font-light tracking-[-0.065em] sm:text-5xl">
          {bookmark.title}
        </h3>
        <p className="mt-4 line-clamp-2 max-w-sm text-sm leading-6 text-muted-foreground">
          {getSummary(bookmark)}
        </p>
        <div className="mt-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em]">
          View website
          <span className="h-px w-12 bg-current transition-[width] duration-300 group-hover:w-20" />
        </div>
      </div>
    </Link>
  );
}

function PosterCard({
  bookmark,
  index,
}: {
  bookmark: CardStyleBookmark;
  index: number;
}) {
  return (
    <Link
      href={`/${bookmark.slug}`}
      className="group relative flex min-h-[31rem] overflow-hidden rounded-[0.75rem] bg-slate-900 text-white shadow-[0_24px_65px_rgba(15,23,42,0.20)]"
    >
      {bookmark.ogImage ? (
        // Arbitrary publisher images cannot be safely enumerated for next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bookmark.ogImage}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.06]"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#4773ff_0%,transparent_30%),radial-gradient(circle_at_80%_75%,#ff7b54_0%,transparent_32%),#101522]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/5 to-black/95" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative flex w-full flex-col p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-white/35 pb-4 font-mono text-[10px] uppercase tracking-[0.17em]">
          <span>{bookmark.category?.name || "Visual selection"}</span>
          <span>0{index + 1}</span>
        </div>

        <div className="mt-auto">
          <Logo
            bookmark={bookmark}
            className="mb-5 h-14 w-14 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
          />
          <h3 className="text-4xl font-semibold leading-[0.94] tracking-[-0.065em] sm:text-5xl">
            {bookmark.title}
          </h3>
          <p className="mt-4 line-clamp-2 max-w-sm text-sm leading-6 text-white/70">
            {getSummary(bookmark)}
          </p>
          <div className="mt-6 flex items-center justify-between border-t border-white/35 pt-4 text-xs font-medium">
            <span>{getHostname(bookmark.url)}</span>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function BrowserShowcaseCard({ bookmark }: { bookmark: CardStyleBookmark }) {
  return (
    <BookmarkCard
      bookmark={{
        id: bookmark.id,
        url: bookmark.url,
        title: bookmark.title,
        slug: bookmark.slug,
        description: bookmark.description,
        overview: bookmark.overview,
        favicon: bookmark.favicon,
        ogImage: bookmark.ogImage,
        isArchived: false,
        isFavorite: bookmark.isFavorite ?? false,
        category: bookmark.category
          ? {
              id: bookmark.category.slug,
              name: bookmark.category.name,
              slug: bookmark.category.slug,
              color: bookmark.category.color || undefined,
            }
          : undefined,
      }}
    />
  );
}

function EditorialCoverCard({
  bookmark,
  reverse,
}: {
  bookmark: CardStyleBookmark;
  reverse?: boolean;
}) {
  return (
    <Link
      href={`/${bookmark.slug}`}
      className="group grid overflow-hidden border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950 md:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]"
    >
      <div
        className={cn(
          "relative min-h-64 overflow-hidden bg-slate-100 md:min-h-72",
          reverse && "md:order-2",
        )}
      >
        {bookmark.ogImage ? (
          // Arbitrary publisher images cannot be safely enumerated for next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bookmark.ogImage}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-[transform,filter] duration-700 group-hover:scale-[1.035] group-hover:saturate-[1.08]"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(125deg,#c8d6f4_0%,#e7edf8_45%,#efd8c7_100%)]">
            <span className="absolute bottom-0 right-5 text-[11rem] font-black leading-[0.75] text-white/55">
              {bookmark.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span className="absolute bottom-4 left-4 rounded-full bg-white/85 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-800 backdrop-blur-md">
          Cover story
        </span>
      </div>

      <div
        className={cn(
          "flex min-h-64 flex-col p-6 sm:p-8",
          reverse && "md:order-1",
        )}
      >
        <div className="flex items-center justify-between">
          <Logo
            bookmark={bookmark}
            className="h-12 w-12 rounded-xl border border-slate-200 dark:border-white/10"
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-600">
            {bookmark.category?.name || "Selected"}
          </span>
        </div>
        <div className="my-auto py-8">
          <h3 className="text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">
            {bookmark.title}
          </h3>
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {getSummary(bookmark)}
          </p>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs font-medium dark:border-white/10">
          <span className="text-muted-foreground">
            {getHostname(bookmark.url)}
          </span>
          <span className="flex items-center gap-2">
            查看网站
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function BookmarkCardVariants({ bookmarks }: CardStyleVariantsProps) {
  return (
    <div className="space-y-24 sm:space-y-32">
      <section id="option-a" className="scroll-mt-24">
        <OptionHeading
          label="A"
          title="精准目录"
          description="信息密度适中、结构清楚、适合工具很多的主列表。专业、稳妥，也最接近现有品牌气质。"
          tone="bg-blue-600 text-white"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((bookmark) => (
            <PrecisionCard key={bookmark.id} bookmark={bookmark} />
          ))}
        </div>
      </section>

      <section id="option-b" className="scroll-mt-24">
        <OptionHeading
          label="B"
          title="视觉封面"
          description="让产品截图成为主角，第一眼更有冲击力。适合图片质量稳定、希望提高浏览与点击欲望的列表。"
          tone="bg-violet-600 text-white"
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((bookmark) => (
            <CanvasCard key={bookmark.id} bookmark={bookmark} />
          ))}
        </div>
      </section>

      <section id="option-c" className="scroll-mt-24">
        <OptionHeading
          label="C"
          title="编辑索引"
          description="弱化传统卡片边框，像设计杂志的精选目录。阅读节奏快，个性最强，也能在一屏容纳更多条目。"
          tone="bg-orange-600 text-white"
        />
        <div className="border-t border-stone-300 bg-[#f8f4ec] px-4 dark:border-stone-700 dark:bg-stone-950 sm:px-5">
          {bookmarks.map((bookmark, index) => (
            <LedgerRow key={bookmark.id} bookmark={bookmark} index={index} />
          ))}
        </div>
      </section>

      <section id="option-d" className="scroll-mt-24">
        <OptionHeading
          label="D"
          title="工具坞站"
          description="深色、技术感强，像开发者工作台。辨识度高，适合强调 AI、开发工具与数字产品属性。"
          tone="bg-emerald-500 text-slate-950"
        />
        <div className="rounded-2xl bg-[#05080d] p-3 sm:p-5">
          <div className="mb-4 flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600">
            <span className="flex items-center gap-2">
              <Layers3 className="h-3.5 w-3.5" />
              Curated directory
            </span>
            <span>{bookmarks.length} entries</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bookmarks.map((bookmark) => (
              <DockCard key={bookmark.id} bookmark={bookmark} />
            ))}
          </div>
        </div>
      </section>

      <section id="option-e" className="scroll-mt-24">
        <OptionHeading
          label="E"
          title="Bento 展台"
          description="用一张主推卡带动两张辅助卡，层级非常明确。适合首页精选、专题列表和需要运营主次顺序的场景。"
          tone="bg-indigo-600 text-white"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {bookmarks.map((bookmark, index) => (
            <BentoCard
              key={bookmark.id}
              bookmark={bookmark}
              featured={index === 0}
            />
          ))}
        </div>
      </section>

      <section id="option-f" className="scroll-mt-24">
        <OptionHeading
          label="F"
          title="柔软星球"
          description="柔和色块、有机圆形与超大圆角，亲和力更强。适合面向大众用户、生活方式或创意效率类网站。"
          tone="bg-fuchsia-500 text-white"
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((bookmark, index) => (
            <SoftCard key={bookmark.id} bookmark={bookmark} index={index} />
          ))}
        </div>
      </section>

      <section id="option-g" className="scroll-mt-24">
        <OptionHeading
          label="G"
          title="醒目信号"
          description="粗边框、硬阴影和高饱和原色，点击感和辨识度都很强。适合年轻、实验性或社区化的产品气质。"
          tone="bg-black text-white"
        />
        <div className="grid gap-7 px-1 pb-2 md:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((bookmark, index) => (
            <BrutalCard key={bookmark.id} bookmark={bookmark} index={index} />
          ))}
        </div>
      </section>

      <section id="option-h" className="scroll-mt-24">
        <OptionHeading
          label="H"
          title="静默焦点"
          description="用大量留白、细线和超大编号建立高级感，让每个网站像作品集条目一样被认真展示。"
          tone="bg-stone-200 text-stone-950"
        />
        <div className="grid gap-x-9 md:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((bookmark, index) => (
            <SpotlightCard
              key={bookmark.id}
              bookmark={bookmark}
              index={index}
            />
          ))}
        </div>
      </section>

      <section id="option-i" className="scroll-mt-24">
        <OptionHeading
          label="I"
          title="沉浸海报"
          description="视觉封面的电影海报版本：图片铺满整张卡片，文字沉入画面底部，第一眼冲击力最强。"
          tone="bg-rose-600 text-white"
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((bookmark, index) => (
            <PosterCard key={bookmark.id} bookmark={bookmark} index={index} />
          ))}
        </div>
      </section>

      <section id="option-j" className="scroll-mt-24">
        <OptionHeading
          label="J"
          title="浏览器橱窗"
          description="把封面放进浏览器窗口中，用户能立刻理解这是一个网站产品；更可信，也更接近真实使用场景。"
          tone="bg-amber-500 text-stone-950"
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((bookmark) => (
            <BrowserShowcaseCard key={bookmark.id} bookmark={bookmark} />
          ))}
        </div>
      </section>

      <section id="option-k" className="scroll-mt-24">
        <OptionHeading
          label="K"
          title="横向画报"
          description="封面与文字左右分栏，并交替改变图片方向。适合桌面端宽列表，介绍更完整，浏览节奏也更有变化。"
          tone="bg-cyan-600 text-white"
        />
        <div className="space-y-4">
          {bookmarks.map((bookmark, index) => (
            <EditorialCoverCard
              key={bookmark.id}
              bookmark={bookmark}
              reverse={index % 2 === 1}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
