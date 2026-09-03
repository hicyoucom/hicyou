// AES-256-GCM encryption for webhook signing secrets at rest. Secrets must be
// recoverable (to sign payloads), so they can't be hashed — instead they're
// encrypted with WEBHOOK_SECRET_KEY (32 bytes, hex or base64).
//
// Back-compat / dev: if no key is configured, secrets are stored as plaintext
// (current behaviour) and decrypt() passes them through. Stored ciphertext is
// tagged `enc:v1:<iv>:<tag>:<ciphertext>` (all base64) so the two are
// distinguishable and decryption never guesses.
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const raw = process.env.WEBHOOK_SECRET_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("WEBHOOK_SECRET_KEY is required in production");
    }
    return null; // local development keeps the legacy plaintext fallback
  }
  const buf = Buffer.from(raw, /^[0-9a-fA-F]{64}$/.test(raw) ? "hex" : "base64");
  // Set-but-invalid must fail closed — never silently store secrets as plaintext
  // when the operator believes encryption is on.
  if (buf.length !== 32) {
    throw new Error("WEBHOOK_SECRET_KEY must be 32 bytes (64 hex chars or base64-encoded)");
  }
  return buf;
}

export function isEncrypted(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

/** Encrypt a secret for storage. Returns plaintext unchanged if no key is set. */
export function encryptSecret(plain: string): string {
  const key = getKey();
  if (!key) return plain; // no key → plaintext fallback (dev / not yet configured)
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv, tag, ct].map((b) => b.toString("base64")).join(":");
}

/** Decrypt a stored secret. Legacy plaintext (no prefix) is returned as-is. */
export function decryptSecret(stored: string): string {
  // getKey() first so a set-but-invalid key fails closed even for legacy
  // plaintext rows (don't silently proceed on a misconfigured key).
  const key = getKey();
  if (!isEncrypted(stored)) return stored;
  if (!key) throw new Error("WEBHOOK_SECRET_KEY is required to decrypt an encrypted webhook secret");
  const parts = stored.split(":"); // ["enc","v1",iv,tag,ct]
  if (parts.length !== 5) throw new Error("Malformed encrypted webhook secret");
  const iv = Buffer.from(parts[2], "base64");
  const tag = Buffer.from(parts[3], "base64");
  const ct = Buffer.from(parts[4], "base64");
  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error("Malformed encrypted webhook secret (bad iv/tag length)");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
