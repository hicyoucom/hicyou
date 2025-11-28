"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { TopNav } from "@/components/top-nav";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-destructive/5">
          <TopNav />
          <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 73px)" }}>
          <div className="max-w-2xl mx-auto px-4 text-center">
            {/* Error Icon */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
                <AlertTriangle className="relative h-24 w-24 text-destructive" />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                Something Went Wrong
              </h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                We encountered an unexpected error. Don't worry, our team has been notified.
              </p>
            </div>

            {/* Error Details (Development) */}
            {process.env.NODE_ENV === "development" && (
              <div className="mt-8 p-4 bg-muted/50 rounded-lg text-left max-w-lg mx-auto">
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
                Back to Home
              </Button>
            </div>

            {/* Additional Info */}
            <div className="mt-16 pt-8 border-t">
              <p className="text-sm text-muted-foreground">
                If this problem persists, please contact support.
              </p>
            </div>
          </div>
          </div>
        </div>
      </body>
    </html>
  );
}

