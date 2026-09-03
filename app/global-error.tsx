"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#f7f6f2",
          color: "#181815",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <title>Something went wrong</title>
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "32px 20px",
            boxSizing: "border-box",
          }}
        >
          <section style={{ width: "100%", maxWidth: 560, textAlign: "center" }}>
            <div
              aria-hidden="true"
              style={{
                width: 56,
                height: 56,
                margin: "0 auto 28px",
                border: "1px solid #c96e5a",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                color: "#a9402b",
                fontSize: 28,
                fontWeight: 600,
              }}
            >
              !
            </div>
            <h1 style={{ margin: 0, fontSize: "clamp(32px, 6vw, 52px)", lineHeight: 1.05 }}>
              Something went wrong
            </h1>
            <p style={{ margin: "20px auto 0", maxWidth: 440, color: "#66645d", lineHeight: 1.65 }}>
              The page could not be loaded. Try again, or return to the home page.
            </p>
            {process.env.NODE_ENV === "development" ? (
              <pre
                style={{
                  margin: "28px 0 0",
                  padding: 16,
                  border: "1px solid #dedbd1",
                  borderRadius: 12,
                  background: "#eeece5",
                  textAlign: "left",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  fontSize: 12,
                }}
              >
                {error.message}
                {error.digest ? `\nError ID: ${error.digest}` : ""}
              </pre>
            ) : null}
            <div style={{ marginTop: 32, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={retry}
                style={{
                  border: 0,
                  borderRadius: 999,
                  background: "#181815",
                  color: "#fff",
                  padding: "12px 20px",
                  font: "inherit",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              {/* The global fallback replaces every root layout; keep this a
                  dependency-free document navigation instead of mounting the
                  application router inside the last-resort error UI. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                style={{
                  border: "1px solid #c9c6bc",
                  borderRadius: 999,
                  color: "inherit",
                  padding: "11px 20px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Back to home
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
