import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft } from "lucide-react";
import { TopNav } from "@/components/top-nav";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <TopNav />
      <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 73px)" }}>
      <div className="max-w-2xl mx-auto px-4 text-center">
        {/* 404 Number */}
        <div className="relative">
          <h1 className="text-[180px] md:text-[240px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary/20 to-primary/5 leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl md:text-7xl">🔍</div>
          </div>
        </div>

        {/* Error Message */}
        <div className="mt-8 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Page Not Found
          </h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/">
            <Button size="lg" className="gap-2">
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Link href="/">
            <Button size="lg" variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              Search Tools
            </Button>
          </Link>
        </div>

        {/* Additional Help */}
        <div className="mt-16 pt-8 border-t">
          <p className="text-sm text-muted-foreground mb-4">
            Looking for something specific?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link 
              href="/c" 
              className="text-primary hover:underline flex items-center gap-1"
            >
              Browse Categories
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link 
              href="/submit" 
              className="text-primary hover:underline flex items-center gap-1"
            >
              Submit a Tool
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link 
              href="/hi-studio" 
              className="text-primary hover:underline flex items-center gap-1"
            >
              Admin Panel
            </Link>
          </div>
        </div>

        {/* Fun Error Codes */}
        <div className="mt-8 text-xs text-muted-foreground/50">
          Error Code: 404 | Resource Not Found
        </div>
      </div>
      </div>
    </div>
  );
}

