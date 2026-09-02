"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { type LucideProps } from "lucide-react";

// Each entry in dynamicIconImports is `() => import("lucide-react/.../<icon>")`,
// so wrapping with next/dynamic ships one chunk per icon. Replaces the previous
// `import * as LucideIcons from "lucide-react"` wildcard, which forced the
// entire 1544-icon set (~140 KB parsed) onto every page that mounted
// DynamicIcon — the icon-picker only needs ~70 named choices, and category /
// tag rows only render one icon at a time.

type IconName = keyof typeof dynamicIconImports;

interface DynamicIconProps extends Omit<LucideProps, "name"> {
  name?: string | null;
  fallback?: React.ReactNode;
}

// Aliases for icons renamed during lucide upgrades — DB rows seeded under the
// older PascalCase names (e.g. "Home", "AlertCircle", "XCircle") still
// resolve. Add a row here when an icon disappears from a future lucide bump.
// The "X" suffix-as-prefix forms (XCircle, XSquare, XOctagon) were flipped to
// "circle-x" style in lucide ~0.300.
const LEGACY_ALIASES: Record<string, IconName> = {
  home: "house",
  tool: "wrench",
  "bar-chart": "chart-bar",
  "bar-chart-3": "chart-no-axes-column",
  "code-2": "code-xml",
  edit: "pencil",
  "alert-circle": "circle-alert",
  "help-circle": "circle-help",
  "x-circle": "circle-x",
  "x-square": "square-x",
  "x-octagon": "octagon-x",
  "check-circle": "circle-check",
  "plus-circle": "circle-plus",
  "minus-circle": "circle-minus",
  "info-circle": "circle-help", // lucide collapses these onto circle-help/info
};

// kebab conversion that handles:
//   • single-leading-cap: "House" → "house"
//   • run-of-caps before camel tail: "XCircle" → "x-circle", "XMLParser" → "xml-parser"
//   • camelCase tail: "FileText" → "file-text"
//   • letter↔digit boundary: "Gamepad2" → "gamepad-2", "Trash2Plus" → "trash-2-plus"
function toKebab(name: string): string {
  return name
    .replace(/([a-zA-Z])([0-9])/g, "$1-$2") // letter→digit
    .replace(/([0-9])([a-zA-Z])/g, "$1-$2") // digit→letter (e.g. "2Plus" → "2-Plus")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2") // run-of-caps + camel tail
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2") // camelCase
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

// Cache next/dynamic wrappers — without this each render of the same icon
// rebuilds the lazy component (no memoization → spurious chunk reloads).
const componentCache = new Map<IconName, React.ComponentType<LucideProps>>();

function getIcon(key: IconName): React.ComponentType<LucideProps> {
  let cached = componentCache.get(key);
  if (cached) return cached;
  cached = dynamic(dynamicIconImports[key], {
    ssr: true,
    loading: () => null,
  });
  componentCache.set(key, cached);
  return cached;
}

export function DynamicIcon({
  name,
  fallback = null,
  ...props
}: DynamicIconProps) {
  if (!name) return <>{fallback}</>;
  const kebab = toKebab(name);
  const resolved =
    kebab in dynamicIconImports ? (kebab as IconName) : LEGACY_ALIASES[kebab];

  if (!resolved) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[DynamicIcon] "${name}" → "${kebab}" not in lucide-react/dynamicIconImports`,
      );
    }
    return <>{fallback}</>;
  }
  const Icon = getIcon(resolved);
  // getIcon caches every wrapper at module scope, so a resolved name always
  // receives the same component identity after its first stateless render.
  // eslint-disable-next-line react-hooks/static-components
  return <Icon {...props} />;
}

/**
 * Names exposed to the admin icon picker. Use current lucide names — older
 * PascalCase aliases (Home/Edit/AlertCircle/...) still work via LEGACY_ALIASES
 * for back-compat with DB rows but new picks should use the modern names.
 */
export const POPULAR_ICONS = [
  "House",
  "Book",
  "Code",
  "Palette",
  "Music",
  "Video",
  "Camera",
  "Image",
  "FileText",
  "Folder",
  "Database",
  "Server",
  "Cloud",
  "Globe",
  "Mail",
  "MessageSquare",
  "Users",
  "User",
  "Settings",
  "Wrench",
  "Zap",
  "Star",
  "Heart",
  "ShoppingCart",
  "CreditCard",
  "ChartBar",
  "TrendingUp",
  "Calendar",
  "Clock",
  "MapPin",
  "Phone",
  "Laptop",
  "Smartphone",
  "Gamepad2",
  "Trophy",
  "Award",
  "Gift",
  "Package",
  "Box",
  "Tag",
  "Filter",
  "Search",
  "Bell",
  "Lock",
  "Shield",
  "Key",
  "Eye",
  "EyeOff",
  "Download",
  "Upload",
  "Share",
  "Link",
  "ExternalLink",
  "Copy",
  "Pencil",
  "Trash2",
  "Plus",
  "Minus",
  "Check",
  "X",
  "CircleAlert",
  "Info",
  "CircleHelp",
  "ChevronRight",
  "ChevronLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowUp",
  "ArrowDown",
] as const;
