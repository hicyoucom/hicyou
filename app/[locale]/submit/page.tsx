import React, { Suspense } from "react";
import { getAllCategoriesTranslated } from "@/lib/data";
import { CategorySidebar } from "@/components/category-sidebar";
import { TopNav } from "@/components/top-nav";
import SubmitContent from "./submit-content";
import { getSession } from "@/lib/get-session";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";

export default async function SubmitPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const session = await getSession();

  if (!session) {
    redirect({ href: "/login?next=/submit", locale });
  }

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
          <div className="px-4 lg:px-8 py-8 max-w-3xl mx-auto">
            <SubmitContent
              categories={categories.map((cat) => ({
                id: cat.id.toString(),
                name: cat.name,
                slug: cat.slug,
                color: cat.color,
                icon: cat.icon,
                groupKey: cat.groupKey,
              }))}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
