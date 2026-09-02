"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminHeader from "@/components/admin/admin-header";
import Link from "next/link";

interface Bookmark {
  id: number;
  url: string;
  slug: string;
  title: string;
  description: string | null;
  categoryId: number | null;
  categories: Array<{ id: number; name: string; position: number }>;
  overview: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  isDofollow: boolean;
}

interface PageResponse {
  items: Bookmark[];
  // Cursor is an opaque string: numeric for id-sorted views, base64-encoded
  // JSON for title-sorted views. Treat as a black box; only the server
  // interprets it.
  nextCursor: string | null;
  // null on cursor-paged requests; the server only returns it on the first
  // page to skip a redundant sequential scan. Client memoises locally.
  total: number | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

type ArchivedFilter = "hide" | "only" | "all";
type SortOption = "newest" | "oldest" | "title" | "title_desc";

interface CommittedFilters {
  q: string;
  categoryIds: string[]; // strings so the "none" sentinel can coexist with numeric ids
  archived: ArchivedFilter;
  pricingType: string;
  sort: SortOption;
}

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  title: "Title A → Z",
  title_desc: "Title Z → A",
};

const PAGE_SIZE = 50;
const FILTER_DEBOUNCE_MS = 250;
// Hard-coded enum for the dropdown. The server accepts any string, so a
// new value in prod won't break the API — just won't be selectable from
// the UI until added here.
const PRICING_OPTIONS = ["Free", "Paid", "Freemium", "Open Source"];

const ARCHIVED_URL_VALUES = new Set<ArchivedFilter>(["hide", "only", "all"]);
const SORT_URL_VALUES = new Set<SortOption>(["newest", "oldest", "title", "title_desc"]);
const PRICING_URL_VALUES = new Set<string>(PRICING_OPTIONS);
// category ids from the URL must be the "none" sentinel or a positive
// integer — anything else (typo, manually-edited URL) silently drops so
// the chip group doesn't show ghost-selected state and the API doesn't
// 400 on a deep link.
const CATEGORY_ID_PATTERN = /^(none|[1-9]\d*)$/;

// Hydrate filter state from the current URL on mount. Reading
// `useSearchParams()` here is safe because useState initialisers run
// exactly once per component instance — landing on
// `/hi-studio/manage?q=foo&category=1&category=2&archived=only` restores
// the same view the bookmarked URL captured.
function readFiltersFromUrl(sp: URLSearchParams | ReadonlyURLSearchParams): CommittedFilters {
  const archived = sp.get("archived") as ArchivedFilter | null;
  const sort = sp.get("sort") as SortOption | null;
  const rawPricing = sp.get("pricingType") ?? "";
  return {
    q: sp.get("q") ?? "",
    categoryIds: sp.getAll("category").filter((v) => CATEGORY_ID_PATTERN.test(v)),
    archived: archived && ARCHIVED_URL_VALUES.has(archived) ? archived : "hide",
    // Drop unknown pricing values so the <select> doesn't render in a
    // confusing "selected but no matching option" state.
    pricingType: PRICING_URL_VALUES.has(rawPricing) ? rawPricing : "",
    sort: sort && SORT_URL_VALUES.has(sort) ? sort : "newest",
  };
}

// Bare type re-export so `readFiltersFromUrl` accepts both the mutable
// URLSearchParams and Next's ReadonlyURLSearchParams without casting.
type ReadonlyURLSearchParams = ReturnType<typeof useSearchParams>;

// Inverse of readFiltersFromUrl. Defaults (archived=hide, empty strings,
// empty arrays) collapse to an empty query string so the bare URL is the
// canonical "no filters" form.
function serialiseFiltersToUrl(filters: CommittedFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  for (const c of filters.categoryIds) params.append("category", c);
  if (filters.archived !== "hide") params.set("archived", filters.archived);
  if (filters.pricingType) params.set("pricingType", filters.pricingType);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  return params.toString();
}

// `useSearchParams` opts the entire route into client-side rendering when
// it's read at the top level of a client component. Wrapping the content
// in <Suspense> tells Next that's intentional and prevents the build-time
// "Entire page deopted" warning. The fallback matches the in-content
// loading state so users don't see a UI jump.
export default function ManageBookmarks() {
  return (
    <Suspense
      fallback={
        <>
          <AdminHeader />
          <div className="mx-auto max-w-7xl p-6">
            <div className="text-center">Loading...</div>
          </div>
        </>
      }
    >
      <ManageBookmarksContent />
    </Suspense>
  );
}

function ManageBookmarksContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initial state seeded from the URL exactly once. After mount, state is
  // the source of truth and pushes back into the URL via the effect below
  // — we deliberately do NOT subscribe to URL changes after mount.
  // useState's initializer runs once per component instance, preserving the
  // landing URL without reading a ref during render.
  const [initial] = useState(() => readFiltersFromUrl(searchParams));

  // Raw input (re-renders on every keystroke / click).
  const [searchTerm, setSearchTerm] = useState<string>(initial.q);
  const [categoryIds, setCategoryIds] = useState<string[]>(initial.categoryIds);
  const [archived, setArchived] = useState<ArchivedFilter>(initial.archived);
  const [pricingType, setPricingType] = useState<string>(initial.pricingType);
  const [sort, setSort] = useState<SortOption>(initial.sort);

  // Debounced/committed snapshot — what's actually been queried. Seeded
  // with the same URL-derived values so the first render's query matches
  // the bookmarked URL without an extra refetch round-trip.
  const [committed, setCommitted] = useState<CommittedFilters>(() => ({
    q: initial.q,
    categoryIds: [...initial.categoryIds].sort(),
    archived: initial.archived,
    pricingType: initial.pricingType,
    sort: initial.sort,
  }));

  const [items, setItems] = useState<Bookmark[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);

  const [pendingUrls, setPendingUrls] = useState<Set<string>>(() => new Set());
  const isPending = (url: string) => pendingUrls.has(url);

  // Fetch categories once for the multi-select.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { categories: Category[] }) => {
        if (!cancelled) setCategories(data.categories);
      })
      .catch((err) => console.warn("Failed to load categories:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounce all filter changes together so a quick chip toggle followed by
  // a keystroke produces ONE refetch instead of two.
  useEffect(() => {
    const handle = setTimeout(() => {
      setCommitted({
        q: searchTerm.trim(),
        categoryIds: [...categoryIds].sort(),
        archived,
        pricingType,
        sort,
      });
    }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchTerm, categoryIds, archived, pricingType, sort]);

  // Mirror committed filters into the URL with router.replace (no history
  // entry per keystroke) and scroll: false (don't snap to top). The bare
  // URL — `/hi-studio/manage` with no query string — is the canonical
  // "no filters" state so admins can copy a filtered URL and paste it
  // somewhere meaningful.
  //
  // The guard compares against the URL parsed through the SAME serialiser
  // (`serialiseFiltersToUrl(readFiltersFromUrl(...))`), so different
  // param orderings or unknown-key residue in the URL don't trigger a
  // spurious replace on mount. We intentionally don't depend on
  // `searchParams` — re-running this effect on URL change would create
  // a loop with our own replace call.
  useEffect(() => {
    const qs = serialiseFiltersToUrl(committed);
    const currentCanonical = serialiseFiltersToUrl(readFiltersFromUrl(searchParams));
    if (qs === currentCanonical) return;
    const target = qs ? `${pathname}?${qs}` : pathname;
    router.replace(target, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committed, pathname, router]);

  // Abort in-flight requests when filters change — prevents an older
  // response from clobbering a freshly-filtered one.
  const inflightRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(
    async (opts: { cursor: string | null; filters: CommittedFilters; append: boolean }) => {
      inflightRef.current?.abort();
      const controller = new AbortController();
      inflightRef.current = controller;

      if (opts.append) setLoadingMore(true);
      else setLoadingInitial(true);

      try {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        if (opts.cursor != null) params.set("cursor", opts.cursor);
        if (opts.filters.q) params.set("q", opts.filters.q);
        for (const id of opts.filters.categoryIds) params.append("category", id);
        if (opts.filters.archived !== "hide") params.set("archived", opts.filters.archived);
        if (opts.filters.pricingType) params.set("pricingType", opts.filters.pricingType);
        if (opts.filters.sort !== "newest") params.set("sort", opts.filters.sort);

        const response = await fetch(`/api/bookmarks?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: PageResponse = await response.json();

        setItems((prev) => (opts.append ? [...prev, ...data.items] : data.items));
        setNextCursor(data.nextCursor);
        if (data.total !== null) setTotal(data.total);
        setError(null);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        console.error("Error fetching bookmarks:", err);
        setError("Failed to load bookmarks");
      } finally {
        if (controller === inflightRef.current) {
          setLoadingInitial(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  // Reset + fetch when committed filters change. Clearing up-front prevents
  // the "Showing 12 of <old-total> for 'newq'" flash while the new response
  // is in flight.
  useEffect(() => {
    const handle = setTimeout(() => {
      setItems([]);
      setTotal(0);
      setNextCursor(null);
      void loadPage({ cursor: null, filters: committed, append: false });
    }, 0);
    return () => clearTimeout(handle);
  }, [committed, loadPage]);

  const handleLoadMore = () => {
    if (nextCursor == null || loadingMore) return;
    loadPage({ cursor: nextCursor, filters: committed, append: true });
  };

  const toggleCategoryId = (id: string) => {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryIds([]);
    setArchived("hide");
    setPricingType("");
    setSort("newest");
  };

  const filtersActive =
    searchTerm !== "" ||
    categoryIds.length > 0 ||
    archived !== "hide" ||
    pricingType !== "" ||
    sort !== "newest";

  // Helper for chip styling.
  const chipBase =
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors";
  const chipActive = "border-blue-500 bg-blue-500 text-white";
  const chipIdle = "border-gray-300 bg-white text-gray-700 hover:bg-gray-100";

  // Optimistic updates that survive without forcing a refetch.
  const patchLocal = (url: string, patch: Partial<Bookmark>) => {
    setItems((prev) => prev.map((b) => (b.url === url ? { ...b, ...patch } : b)));
  };

  const markPending = (url: string, on: boolean) => {
    setPendingUrls((current) => {
      const next = new Set(current);
      if (on) next.add(url);
      else next.delete(url);
      return next;
    });
  };

  const togglePatch = async (
    url: string,
    field: "isFavorite" | "isDofollow",
    currentValue: boolean,
  ) => {
    if (pendingUrls.has(url)) return;
    markPending(url, true);
    patchLocal(url, { [field]: !currentValue });
    try {
      const response = await fetch(`/api/bookmarks/${encodeURIComponent(url)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !currentValue }),
      });
      if (!response.ok) throw new Error("PATCH failed");
    } catch (err) {
      console.error(`Error updating ${field}:`, err);
      patchLocal(url, { [field]: currentValue });
      alert(`Failed to update ${field}. Please try again.`);
    } finally {
      markPending(url, false);
    }
  };

  const handleDelete = async (url: string) => {
    if (!confirm("Are you sure you want to delete this bookmark?")) return;
    try {
      const response = await fetch(`/api/bookmarks/${encodeURIComponent(url)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("DELETE failed");
      setItems((prev) => prev.filter((b) => b.url !== url));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error deleting bookmark:", err);
      alert("Failed to delete bookmark. Please try again.");
    }
  };

  if (loadingInitial && items.length === 0 && !filtersActive) {
    return (
      <>
        <AdminHeader />
        <div className="mx-auto max-w-7xl p-6">
          <div className="text-center">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader />
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Manage Bookmarks</h1>
          <Link
            href="/hi-studio"
            className="rounded-md bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            Add New Bookmark
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search title / description / overview / notes…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border p-3 pl-10 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Filter bar */}
        <div
          className="mb-3 space-y-2 rounded-lg border bg-gray-50 p-3"
          role="group"
          aria-label="Filter bookmarks"
        >
          {/* Categories — multi-select toggle chips */}
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filter by category"
          >
            <span className="mr-1 text-xs font-medium text-gray-500">Category:</span>
            {categories.map((c) => {
              const selected = categoryIds.includes(String(c.id));
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCategoryId(String(c.id))}
                  aria-pressed={selected}
                  className={`${chipBase} ${selected ? chipActive : chipIdle}`}
                >
                  {c.name}
                </button>
              );
            })}
            {(() => {
              const selected = categoryIds.includes("none");
              return (
                <button
                  onClick={() => toggleCategoryId("none")}
                  aria-pressed={selected}
                  className={`${chipBase} ${selected ? chipActive : chipIdle}`}
                >
                  Uncategorised
                </button>
              );
            })()}
          </div>

          {/* Archived tri-state + Pricing dropdown + Reset */}
          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="Archived filter" className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium text-gray-500">Archived:</span>
              {(["hide", "only", "all"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setArchived(opt)}
                  role="radio"
                  aria-checked={archived === opt}
                  className={`${chipBase} ${archived === opt ? chipActive : chipIdle}`}
                >
                  {opt === "hide" ? "Hide" : opt === "only" ? "Only" : "Show all"}
                </button>
              ))}
            </div>

            <label className="ml-4 flex items-center gap-1 text-xs font-medium text-gray-500">
              Pricing:
              <select
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value)}
                aria-label="Pricing type filter"
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
              >
                <option value="">(any)</option>
                {PRICING_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="ml-2 flex items-center gap-1 text-xs font-medium text-gray-500">
              Sort:
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                aria-label="Sort order"
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
              >
                {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
                  <option key={s} value={s}>
                    {SORT_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>

            {filtersActive && (
              <button
                onClick={resetFilters}
                className="ml-auto text-xs font-medium text-blue-600 hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {items.length} of {total}
            {loadingInitial && " (loading…)"}
          </span>
          {error && <span className="text-red-500">{error}</span>}
        </div>

        <div className="grid gap-4">
          {items.map((bookmark) => (
            <div
              key={bookmark.id}
              className="rounded-lg border p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{bookmark.title}</h2>
                    {bookmark.categories.map((category) => (
                      <span
                        key={category.id}
                        className={
                          category.position === 0
                            ? "rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                            : "rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        }
                      >
                        {category.name}
                      </span>
                    ))}
                    {bookmark.isArchived && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        archived
                      </span>
                    )}
                  </div>
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-blue-500 hover:underline"
                  >
                    {bookmark.url}
                  </a>
                  {bookmark.description && (
                    <p className="mt-2 text-gray-600">{bookmark.description}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => togglePatch(bookmark.url, "isFavorite", bookmark.isFavorite)}
                      disabled={isPending(bookmark.url)}
                      className={`rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        bookmark.isFavorite
                          ? "bg-yellow-500 text-white hover:bg-yellow-600"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                      title="Toggle Favorite"
                    >
                      {bookmark.isFavorite ? "★ Favorite" : "☆ Favorite"}
                    </button>

                    <button
                      onClick={() => togglePatch(bookmark.url, "isDofollow", bookmark.isDofollow)}
                      disabled={isPending(bookmark.url)}
                      className={`rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        bookmark.isDofollow
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                      title="Toggle Dofollow"
                    >
                      {bookmark.isDofollow ? "✓ Dofollow" : "✗ Nofollow"}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(bookmark.url)}
                  className="ml-4 text-red-500 transition-colors hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {items.length === 0 && !loadingInitial && (
            <div className="py-8 text-center text-gray-500">
              {filtersActive
                ? "No bookmarks match the current filters."
                : "No bookmarks found. Add some bookmarks to get started!"}
            </div>
          )}

          {nextCursor != null && (
            <div className="flex justify-center py-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-md border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : `Load more (${total - items.length} left)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
