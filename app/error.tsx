"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { TopNav } from "@/components/top-nav";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 73px)" }}>
      <div className="max-w-2xl mx-auto px-4 text-center">
        {/* Error Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full" />
            <AlertCircle className="relative h-20 w-20 text-destructive" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Oops! Something Went Wrong
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            We're sorry for the inconvenience. An unexpected error occurred while loading this page.
          </p>
        </div>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mt-8 p-4 bg-muted rounded-lg text-left max-w-lg mx-auto">
            <p className="text-sm font-mono text-muted-foreground break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground/70 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" onClick={reset} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="gap-2"
            onClick={() => window.location.href = "/"}
          >
            <Home className="h-4 w-4" />
            Go to Homepage
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-16 text-sm text-muted-foreground">
          <p>
            If the problem continues, try{" "}
            <button
              onClick={() => window.location.reload()}
              className="text-primary hover:underline"
            >
              refreshing the page
            </button>{" "}
            or{" "}
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="text-primary hover:underline"
            >
              clearing your cache
            </button>
            .
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

