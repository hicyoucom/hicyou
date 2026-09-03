import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";
import { TopNav } from "@/components/top-nav";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <TopNav />
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "calc(100vh - 73px)" }}
      >
        <div className="mx-auto max-w-2xl px-4 text-center">
          {/* 404 Number */}
          <div className="relative">
            <h1 className="select-none bg-gradient-to-r from-primary/20 to-primary/5 bg-clip-text text-[180px] font-bold leading-none text-transparent md:text-[240px]">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl md:text-7xl">🔍</div>
            </div>
          </div>

          {/* Error Message */}
          <div className="mt-8 space-y-4">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Page Not Found
            </h2>
            <p className="mx-auto max-w-md text-lg text-muted-foreground">
              Oops! The page you're looking for doesn't exist. It might have
              been moved or deleted.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
          <div className="mt-16 border-t pt-8">
            <p className="mb-4 text-sm text-muted-foreground">
              Looking for something specific?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link
                href="/c"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                Browse Categories
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                href="/submit"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                Submit a Tool
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                href="/hi-studio"
                className="flex items-center gap-1 text-primary hover:underline"
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
