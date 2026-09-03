"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

// Drop motion/framer-motion (-118 KB client bundle) — the toggle only animates
// rotate + scale of two icons, which is trivial with CSS transitions. The
// `dark` class on <html> set by next-themes drives the visual state.
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? theme) === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative h-9 w-9 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label="Toggle theme"
    >
      <Sun
        className="h-[1.2rem] w-[1.2rem] transition-transform duration-300 ease-out"
        style={{
          transform: isDark ? "rotate(-90deg) scale(0)" : "rotate(0deg) scale(1)",
        }}
      />
      <Moon
        className="absolute h-[1.2rem] w-[1.2rem] transition-transform duration-300 ease-out"
        style={{
          transform: isDark ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0)",
        }}
      />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
