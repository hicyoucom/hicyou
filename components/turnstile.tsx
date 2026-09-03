"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact";
}

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";
let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (existingScript.dataset.loaded === "true" && !window.turnstile) {
        existingScript.remove();
      } else {
        existingScript.addEventListener(
          "load",
          () => {
            existingScript.dataset.loaded = "true";
            resolve();
          },
          { once: true },
        );
        existingScript.addEventListener(
          "error",
          () => {
            turnstileScriptPromise = null;
            existingScript.remove();
            reject(new Error("Failed to load Turnstile"));
          },
          { once: true },
        );
        return;
      }
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      turnstileScriptPromise = null;
      script.remove();
      reject(new Error("Failed to load Turnstile"));
    };
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

export function Turnstile({
  siteKey,
  onVerify,
  onError,
  theme = "auto",
  size = "normal",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onErrorRef.current = onError;
  }, [onVerify, onError]);

  useEffect(() => {
    let cancelled = false;

    const renderWidget = () => {
      if (containerRef.current && window.turnstile && siteKey) {
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onVerifyRef.current(token),
          "error-callback": () => onErrorRef.current?.(),
          "expired-callback": () => onErrorRef.current?.(),
          theme,
          size,
        });
      }
    };

    if (!siteKey) {
      return;
    }

    loadTurnstileScript()
      .then(() => {
        if (!cancelled) {
          renderWidget();
        }
      })
      .catch(() => {
        if (!cancelled) {
          onErrorRef.current?.();
        }
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, size]);

  // Don't render anything if no site key is provided
  if (!siteKey) {
    return null;
  }

  return <div ref={containerRef} />;
}
