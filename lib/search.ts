/** Keep public search literal and bounded; LIKE metacharacters are user text. */
export const MAX_SEARCH_LENGTH = 120;
export function normalizeSearchTerm(value: string): string {
  const term = value.trim();
  return term.length <= MAX_SEARCH_LENGTH ? term : "";
}
export function searchPattern(value: string): string {
  return `%${value.replace(/[%_\\]/g, (character) => `\\${character}`)}%`;
}
