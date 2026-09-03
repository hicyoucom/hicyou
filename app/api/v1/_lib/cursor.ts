// Opaque keyset-pagination cursor: base64url of { t: ISO timestamp, i: id }.
// Sort is always (timestamp ASC, id ASC); the cursor carries the last row's
// (timestamp, id) so the next page is `WHERE (ts,id) > (cursor.t,cursor.i)`.
import { ApiError } from "./errors";

export type Cursor = { t: string; i: number };

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}

export function decodeCursor(raw: string | null | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      parsed &&
      typeof parsed.t === "string" &&
      typeof parsed.i === "number" &&
      !Number.isNaN(Date.parse(parsed.t))
    ) {
      return { t: parsed.t, i: parsed.i };
    }
  } catch {
    /* fall through */
  }
  throw new ApiError("validation_error", "Invalid cursor", 400);
}
