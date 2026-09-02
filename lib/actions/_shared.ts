// Shared helpers + types for the server-action modules under lib/actions/.
// NOT a "use server" file (it exports a sync helper + a type), so the domain
// action files import from here.
import { updateTag } from "next/cache";
import { requireAdmin as requireAdminAuth } from "@/lib/admin-auth";
import { type CacheTag } from "@/lib/cache-tags";

export type ActionState<T = unknown> = {
  success?: boolean;
  error?: string;
  message?: string;
  data?: T;
  progress?: {
    current: number;
    total: number;
    currentUrl?: string;
    lastAdded?: string;
  };
};

// Path-based revalidation handles ISR for specific URLs; tag-based handles
// the underlying lib/data.ts unstable_cache wrappers. Mutations call both so
// the layered cache stays consistent without one side falling stale.
export function invalidate(...tags: CacheTag[]) {
  for (const t of tags) updateTag(t);
}

export async function requireAdmin(): Promise<ActionState | null> {
  const auth = await requireAdminAuth();
  if (!auth.ok) {
    return { error: "Unauthorized: admin access required" };
  }
  return null;
}
