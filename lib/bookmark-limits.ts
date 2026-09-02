// Shared length limits for the `bookmarks` table.
//
// `MAX_BOOKMARK_TITLE_LENGTH` is the single source of truth that pairs the
// write side (validation in actions / PATCH zod schema) with the read side
// (cursor cap in the paginated GET). The base64url-JSON cursor used by
// title-sort pagination embeds the row's title; if titles were unbounded,
// the cursor could grow past the GET's `cursor.max()` and 400 the next
// page for a row we just returned.
//
// 500 is well above any realistic bookmark title (in-DB max as of this
// commit is ~80 chars) but bounded enough that the encoded cursor stays
// comfortably under the 4096 cap — even a max-length title encodes to
// roughly 700 base64url chars.
export const MAX_BOOKMARK_TITLE_LENGTH = 500;
