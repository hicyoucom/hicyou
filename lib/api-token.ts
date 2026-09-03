// Shared minting/hashing for public API tokens (/api/v1). Only the SHA-256
// hash is ever stored; the plaintext is returned once to the caller.
import { randomBytes, createHash } from "node:crypto";

export const TOKEN_PREFIX = "hcy_live_";
export const DEFAULT_SCOPES = ["read:products"];

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Generate a new token: `hcy_live_<32 url-safe chars>` + its hash + display prefix. */
export function generateApiToken(): { token: string; tokenHash: string; prefix: string } {
  const token = `${TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`; // 32 url-safe chars
  return { token, tokenHash: hashToken(token), prefix: token.slice(0, 16) };
}
