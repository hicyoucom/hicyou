// Barrel for the admin server actions, split by domain under lib/actions/.
// Call sites keep importing from "@/lib/actions"; each action lives in its
// domain module. See lib/actions/_shared.ts for the common helpers/types.
export type { ActionState } from "./actions/_shared";
export * from "./actions/categories";
export * from "./actions/bookmarks";
export * from "./actions/tags";
export * from "./actions/collections";
export * from "./actions/translations";
