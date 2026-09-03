import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, r2Config, getR2Path, getR2PublicUrl, isR2Configured } from "@/lib/r2";
import {
  processImageToAvif,
  validateImage,
  generateUniqueFilename,
} from "@/lib/image-processor";
import { getClientIp, checkActionRateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/get-session";

// 强制动态渲染
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_UPLOADS_PER_HOUR = 10;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;
const MAX_FILE_BYTES = 1 * 1024 * 1024;
// Multipart framing adds a small amount of overhead. Reject obviously large
// bodies before request.formData() asks the runtime to buffer and parse them.
const MAX_UPLOAD_BODY_BYTES = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Uploads write directly to persistent object storage. Require a verified
    // application session instead of relying on a client-only submit form.
    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Rate-limit per account and IP (DB-backed; works across serverless
    // instances). Including the account prevents users behind one NAT from
    // consuming each other's quota.
    const clientIp = getClientIp(request);
    const rl = await checkActionRateLimit(
      "upload",
      `${userId}:${clientIp}`,
      MAX_UPLOADS_PER_HOUR,
      UPLOAD_WINDOW_MS,
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many upload attempts. Maximum ${MAX_UPLOADS_PER_HOUR} uploads per hour. Please try again later.` },
        { status: 429 }
      );
    }

    // Check if R2 is configured
    if (!isR2Configured || !r2Client) {
      return NextResponse.json(
        { error: "R2 storage is not configured. Please check your environment variables." },
        { status: 500 }
      );
    }

    const contentLength = Number(request.headers.get("content-length"));
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_UPLOAD_BODY_BYTES
    ) {
      return NextResponse.json(
        { error: "Upload request too large. Maximum file size is 1MB" },
        { status: 413 },
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file");
    const type = formData.get("type") as "logo" | "cover";

    // Validate inputs
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!type || !["logo", "cover"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid upload type. Must be 'logo' or 'cover'" },
        { status: 400 }
      );
    }

    // Validate file type (MIME type check). SVG is rejected because it can
    // contain inline JavaScript (stored XSS) when served as image/svg+xml.
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid image file. Supported formats: JPG, PNG, WebP, GIF. Max size: 1MB" },
        { status: 400 }
      );
    }

    // Validate the browser-provided size before allocating another full copy
    // for image decoding. The decoded buffer is checked again below.
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 1MB" },
        { status: 413 }
      );
    }

    // Convert file to buffer only after the inexpensive type/size checks.
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 1MB" },
        { status: 413 },
      );
    }

    const isValid = await validateImage(buffer);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid image file. Supported formats: JPG, PNG, WebP, GIF. Max size: 1MB" },
        { status: 400 }
      );
    }

    // Process image to AVIF
    const processOptions = type === "logo"
      ? { maxWidth: 800, maxHeight: 800, quality: 85 }
      : { maxWidth: 2000, maxHeight: 2000, quality: 80 };

    const avifBuffer = await processImageToAvif(buffer, processOptions);

    // Generate unique filename
    const filename = generateUniqueFilename(file.name);
    const path = getR2Path(type, filename);

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: r2Config.bucketName,
      Key: path,
      Body: avifBuffer,
      ContentType: "image/avif",
      CacheControl: "public, max-age=31536000, immutable",
    });

    await r2Client.send(uploadCommand);

    // Get public URL
    const publicUrl = getR2PublicUrl(path);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      type,
      size: avifBuffer.length,
    });

  } catch (error) {
    logger.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  return NextResponse.json({
    configured: isR2Configured,
  });
}
