// Shared types for the bookmark-manager component and its extracted panels.

import type { Faq, KeyFeature } from "@/db/schema";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  groupKey: string;
  status: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface Bookmark {
  id: number;
  title: string;
  slug: string;
  url: string;
  description: string | null;
  overview: string | null;
  whyStartups: string | null;
  alternatives: string | null;

  search_results: string | null;
  favicon: string | null;
  ogImage: string | null;
  categoryId: number | null;
  isFavorite: boolean;
  isArchived: boolean;
  isDofollow: boolean;
  createdAt: Date;
  updatedAt: Date;
  notes: string | null;
  keyFeatures: KeyFeature[] | null;
  useCases: string[] | null;
  faqs: Faq[] | null;
}

export interface BookmarkWithCategory extends Bookmark {
  category: Category | null;
  categories: Array<Category & { position: number }>;
}

// Shape of the edit form's local state.
export interface BookmarkFormData {
  title: string;
  slug: string;
  url: string;
  description: string;
  overview: string;
  whyStartups: string;
  alternatives: string;
  search_results: string;
  favicon: string;
  ogImage: string;
  categoryId: string;
  categoryIds: string[];
  isFavorite: boolean;
  isArchived: boolean;
  isDofollow: boolean;
  keyFeatures: string;
  useCases: string;
  faqs: string;
}
