// Globals injected by the analytics snippets (Matomo + GA4).
export {};

declare global {
  interface Window {
    _paq?: unknown[][];
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
