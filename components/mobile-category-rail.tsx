import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

type Category = {
  id: string;
  name: string;
  slug: string;
};

export function MobileCategoryRail({
  categories,
  label,
  allCategoriesLabel,
}: {
  categories: readonly Category[];
  label: string;
  allCategoriesLabel: string;
}) {
  if (categories.length === 0) return null;

  return (
    <section className="mb-8 lg:hidden" aria-label={label}>
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold tracking-tight">{label}</p>
        <Link
          className="inline-flex items-center gap-0.5 text-xs font-medium text-primary"
          href="/c"
        >
          {allCategoriesLabel}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.slice(0, 10).map((category) => (
          <Link
            key={category.id}
            className="shrink-0 snap-start rounded-full border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/50 hover:text-primary"
            href={`/c/${category.slug}`}
          >
            {category.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
