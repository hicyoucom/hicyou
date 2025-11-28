import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, r2Config, getR2Path, getR2PublicUrl, isR2Configured } from "@/lib/r2";
import {
  processImageToAvif,
  validateImage,
  generateUniqueFilename,
} from "@/lib/image-processor";
import { getClientIp } from "@/lib/rate-limit";

// 强制动态渲染
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Simple in-memory rate limiting for uploads
// Key: IP address, Value: { count: number, resetTime: number }
const uploadRateLimit = new Map<string, { count: number; resetTime: number }>();
const MAX_UPLOADS_PER_HOUR = 10; // 每小时最多10次上传
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

function checkUploadRateLimit(ip: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const record = uploadRateLimit.get(ip);

  // Clean up old records periodically
  if (uploadRateLimit.size > 1000) {
    const keysToDelete: string[] = [];
    uploadRateLimit.forEach((value, key) => {
      if (now > value.resetTime) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => uploadRateLimit.delete(key));
  }

  if (!record || now > record.resetTime) {
    // New window
    uploadRateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (record.count >= MAX_UPLOADS_PER_HOUR) {
    return {
      allowed: false,
      error: `Too many upload attempts. Maximum ${MAX_UPLOADS_PER_HOUR} uploads per hour. Please try again later.`,
    };
  }

  // Increment count
  record.count++;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit first (防止恶意上传)
    const clientIp = getClientIp(request);
    const rateLimitCheck = checkUploadRateLimit(clientIp);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.error },
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

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as "logo" | "cover";

    // Note: We don't verify Turnstile token here because:
    // 1. Turnstile tokens can only be used once
    // 2. Users need to upload multiple images (logo + cover)
    // 3. The main form submission will verify the token
    // 4. We use IP-based rate limiting (10 uploads/hour) to prevent abuse
    // This is safe because image uploads are temporary and will only be linked
    // to submissions after the main form passes Turnstile verification

    // Validate inputs
    if (!file) {
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

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file type (MIME type check)
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "image/avif",
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid image file. Supported formats: JPG, PNG, WebP, GIF, SVG, AVIF. Max size: 1MB" },
        { status: 400 }
      );
    }

    // Validate file size (max 1MB)
    if (buffer.length > 1 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 1MB" },
        { status: 400 }
      );
    }

    // For AVIF files, skip Sharp validation as it may not recognize the format
    // Sharp will handle it during processing
    if (file.type !== "image/avif") {
      const isValid = await validateImage(buffer);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid image file. Supported formats: JPG, PNG, WebP, GIF, SVG, AVIF. Max size: 1MB" },
          { status: 400 }
        );
      }
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
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload image" },
      { status: 500 }
    );
  }
}

// Optional: Add GET endpoint to check R2 configuration status
export async function GET() {
  return NextResponse.json({
    configured: isR2Configured,
    bucketName: isR2Configured ? r2Config.bucketName : null,
    publicUrl: isR2Configured ? r2Config.publicUrl : null,
  });
}

