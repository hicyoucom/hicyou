// React + Next Imports
import React from "react";
import { Suspense } from "react";

// Database Imports
import { getAllCategoriesTranslated } from "@/lib/data";

// The sidebar reads directory data, which is available only after the
// production container has completed its strict startup migration.
export const dynamic = "force-dynamic";

// Component Imports
import { CategorySidebar } from "@/components/category-sidebar";
import { TopNav } from "@/components/top-nav";
import BadgeContent from "./badge-content";

export default async function BadgePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const categories = await getAllCategoriesTranslated(locale);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="flex max-w-[1800px] mx-auto">
        {/* Left Sidebar */}
        <Suspense fallback={<div className="hidden lg:block w-56 pr-6 border-r">Loading...</div>}>
          <CategorySidebar
            categories={categories.map((cat) => ({
              id: cat.id.toString(),
              name: cat.name,
              slug: cat.slug,
              color: cat.color || undefined,
              icon: cat.icon || undefined,
              groupKey: cat.groupKey,
            }))}
          />
        </Suspense>

        {/* Main Content */}
        <main className="flex-1 max-w-full overflow-x-hidden w-full lg:w-auto">
          <div className="px-4 lg:px-8 py-8">
            <BadgeContent />
          </div>
        </main>
      </div>
    </div>
  );
}
