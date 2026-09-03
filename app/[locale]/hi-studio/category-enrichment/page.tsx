import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CategoryEnrichmentPanel } from "@/components/admin/category-enrichment-panel";
import { Button } from "@/components/ui/button";
import { getCategoryEnrichmentDashboardData } from "@/lib/category-enrichment";

export const dynamic = "force-dynamic";

export default async function CategoryEnrichmentPage() {
  const data = await getCategoryEnrichmentDashboardData();

  return (
    <main className="min-h-screen bg-muted/20 py-8">
      <div className="mx-auto max-w-[1500px] space-y-5 px-4 sm:px-6 lg:px-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/hi-studio">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Hi Studio
          </Link>
        </Button>
        <CategoryEnrichmentPanel {...data} />
      </div>
    </main>
  );
}
