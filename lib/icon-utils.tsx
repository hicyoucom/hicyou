"use client";

import * as LucideIcons from "lucide-react";
import { LucideProps } from "lucide-react";

// Type for icon names - extract all icon names from lucide-react
type IconName = keyof typeof LucideIcons;

interface DynamicIconProps extends Omit<LucideProps, "name"> {
  name?: string | null;
  fallback?: React.ReactNode;
}

/**
 * Dynamically renders a Lucide icon by name string
 * @param name - The name of the Lucide icon (e.g., "Home", "Book", "Code")
 * @param fallback - Optional fallback component to render if icon is not found
 * @param props - Additional props to pass to the icon component
 */
export function DynamicIcon({ 
  name, 
  fallback = null, 
  ...props 
}: DynamicIconProps) {
  if (!name) {
    return <>{fallback}</>;
  }

  // Convert kebab-case or lowercase to PascalCase
  const iconName = name
    .split(/[-_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("") as IconName;

  const IconComponent = LucideIcons[iconName] as React.ComponentType<LucideProps> | undefined;

  if (!IconComponent) {
    console.warn(`Icon "${name}" (resolved as "${iconName}") not found in lucide-react`);
    return <>{fallback}</>;
  }

  return <IconComponent {...props} />;
}

/**
 * Get a list of popular icon names for the icon picker
 */
export const POPULAR_ICONS = [
  "Home",
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
  "Tool",
  "Wrench",
  "Zap",
  "Star",
  "Heart",
  "ShoppingCart",
  "CreditCard",
  "BarChart",
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
  "Edit",
  "Trash2",
  "Plus",
  "Minus",
  "Check",
  "X",
  "AlertCircle",
  "Info",
  "HelpCircle",
  "ChevronRight",
  "ChevronLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowUp",
  "ArrowDown",
] as const;






