import React, { Suspense } from "react";
import { getAllCategories } from "@/lib/data";
import { CategorySidebar } from "@/components/category-sidebar";
import { TopNav } from "@/components/top-nav";
import SubmitContent from "./submit-content";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SubmitPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/submit");
  }

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
          <div className="px-4 lg:px-8 py-8 max-w-3xl mx-auto">
            <SubmitContent
              categories={categories.map((cat) => ({
                id: cat.id.toString(),
                name: cat.name,
                slug: cat.slug,
                color: cat.color,
                icon: cat.icon,
              }))}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
