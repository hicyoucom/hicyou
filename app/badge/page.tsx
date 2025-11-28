// React + Next Imports
import React from "react";
import { Suspense } from "react";

// Database Imports
import { getAllCategories } from "@/lib/data";

// Component Imports
import { CategorySidebar } from "@/components/category-sidebar";
import { TopNav } from "@/components/top-nav";
import BadgeContent from "./badge-content";

export default async function BadgePage() {
  const categories = await getAllCategories();

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
            }))}
            bookmarksCount={0}
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

