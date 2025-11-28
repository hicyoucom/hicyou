"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Star, Archive, Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BookmarkCardProps {
  bookmark: {
    id: number;
    url: string;
    title: string;
    description?: string | null; // Tagline
    category?: {
      id: string;
      name: string;
      slug: string;
      color?: string;
      icon?: string;
    };
    favicon?: string | null;
    overview?: string | null;
    ogImage?: string | null;
    isArchived: boolean;
    isFavorite: boolean;
    isDofollow?: boolean;
    pricingType?: string | null;
    slug: string;
  };
}

export const BookmarkCard = ({ bookmark }: BookmarkCardProps) => {
  const detailsUrl = `/${bookmark.slug}`;

  return (
    <Link
      href={detailsUrl}
      className={cn(
        "not-prose",
        "group relative flex items-start gap-3 overflow-hidden rounded-lg border bg-card p-4",
        "transition-all duration-200 hover:shadow-md hover:border-primary/50",
        bookmark.isArchived && "opacity-60 hover:opacity-100",
        "h-[104px]", // Fixed height for 2 lines of tagline
      )}
    >
      {/* Logo/Favicon */}
      <div className="flex-shrink-0">
        {bookmark.favicon ? (
          <div className="relative h-12 w-12 overflow-hidden rounded-lg border bg-white flex items-center justify-center">
            <img
              src={bookmark.favicon}
              alt={`${bookmark.title} logo`}
              className="h-8 w-8 object-contain"
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted">
            <Bookmark className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Title with badges */}
        <div className="flex items-start gap-2">
          <h3 className="font-semibold text-base leading-tight line-clamp-1 flex-1">
            {bookmark.title}
          </h3>
          {/* Pricing Badge */}
          {bookmark.pricingType && (
            <Badge 
              variant={
                bookmark.pricingType === "Free" ? "default" : 
                bookmark.pricingType === "Freemium" ? "secondary" : 
                "outline"
              }
              className="text-xs flex-shrink-0"
            >
              {bookmark.pricingType}
            </Badge>
          )}
          {bookmark.isFavorite && (
            <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" fill="currentColor" />
          )}
          {bookmark.isArchived && (
            <Archive className="h-4 w-4 text-gray-500 flex-shrink-0" />
          )}
        </div>

        {/* Tagline - always 2 lines height */}
        <div className="h-10"> {/* Fixed height for exactly 2 lines */}
          {bookmark.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-5">
              {bookmark.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};
