/**
 * Error-reporting seam. No backend is wired yet — this is a deliberate no-op
 * so every capture point in the codebase is already in place. To enable:
 *
 *   1. bun add @sentry/nextjs        (GlitchTip speaks the same protocol)
 *   2. Set NEXT_PUBLIC_SENTRY_DSN (+ allow the DSN host in CSP connect-src)
 *   3. Replace the body of captureException below with Sentry.captureException
 *
 * See docs/ERROR_MONITORING.md for the full checklist.
 *
 * CONSTRAINT: this module is imported by client bundles (global-error.tsx is
 * "use client"). It must stay isomorphic — never import node-only modules
 * (fs, crypto, db, etc.) here.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  // no-op by design until a backend is configured
  void error;
  void context;
}
