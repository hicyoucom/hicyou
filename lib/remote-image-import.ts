import { randomUUID } from "node:crypto";

import { PutObjectCommand } from "@aws-sdk/client-s3";

import { processImageToAvif } from "@/lib/image-processor";
import { normalizePublicImageSource } from "@/lib/image-source";
import { logger } from "@/lib/logger";
import {
  getR2Path,
  getR2PublicUrl,
  isR2Configured,
  r2Client,
  r2Config,
} from "@/lib/r2";
import { validateUrlForFetch } from "@/lib/url-validator";

const MAX_REDIRECTS = 3;
const MAX_REMOTE_IMAGE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

type ImageType = "logo" | "cover";

async function readBoundedBody(response: Response): Promise<Buffer> {
  const advertisedLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(advertisedLength) &&
    advertisedLength > MAX_REMOTE_IMAGE_BYTES
  ) {
    throw new Error("Remote image exceeds the size limit");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_REMOTE_IMAGE_BYTES) {
      throw new Error("Remote image exceeds the size limit");
    }
    return buffer;
  }

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_REMOTE_IMAGE_BYTES) {
      void reader.cancel().catch(() => undefined);
      throw new Error("Remote image exceeds the size limit");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function fetchRemoteImage(
  rawUrl: string,
  fetchImpl: typeof fetch,
): Promise<Buffer> {
  let current = await validateUrlForFetch(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    current = await validateUrlForFetch(current.toString());
    const response = await fetchImpl(current, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HiCyouImageBot/1.0; +https://hicyou.com)",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      void response.body?.cancel().catch(() => undefined);
      if (!location) throw new Error("Image redirect has no destination");
      current = new URL(location, current);
      continue;
    }

    if (!response.ok) {
      void response.body?.cancel().catch(() => undefined);
      throw new Error(`Remote image returned HTTP ${response.status}`);
    }

    const contentType =
      response.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase() ??
      "";
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      void response.body?.cancel().catch(() => undefined);
      throw new Error("Remote resource is not a supported image");
    }
    return readBoundedBody(response);
  }

  throw new Error("Remote image redirected too many times");
}

/**
 * Safely downloads, converts, and stores a remote image. When R2 is disabled
 * or processing fails, the original public URL remains usable by the client.
 */
export async function importRemoteImage(
  rawUrl: string,
  type: ImageType,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const publicFallback = normalizePublicImageSource(rawUrl) ?? "";
  if (!rawUrl || !isR2Configured || !r2Client || !r2Config.publicUrl) {
    return publicFallback;
  }

  try {
    const input = await fetchRemoteImage(rawUrl, fetchImpl);
    const output = await processImageToAvif(
      input,
      type === "logo"
        ? { maxWidth: 800, maxHeight: 800, quality: 85 }
        : { maxWidth: 2_000, maxHeight: 2_000, quality: 80 },
    );
    const path = getR2Path(type, `${randomUUID()}.avif`);
    await r2Client.send(
      new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: path,
        Body: output,
        ContentType: "image/avif",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return getR2PublicUrl(path);
  } catch (error) {
    logger.warn("Remote image import failed; preserving source URL", {
      type,
      error,
    });
    return publicFallback;
  }
}
