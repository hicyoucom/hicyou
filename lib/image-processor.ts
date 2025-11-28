import sharp from "sharp";

/**
 * Process and convert image to AVIF format
 * @param buffer - Image buffer
 * @param options - Processing options
 * @returns Processed image buffer in AVIF format
 */
export async function processImageToAvif(
  buffer: Buffer,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<Buffer> {
  const {
    maxWidth = 2000,
    maxHeight = 2000,
    quality = 80,
  } = options;

  try {
    let image = sharp(buffer);

    // Get metadata
    const metadata = await image.metadata();

    // Resize if necessary
    if (
      (metadata.width && metadata.width > maxWidth) ||
      (metadata.height && metadata.height > maxHeight)
    ) {
      image = image.resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Convert to AVIF
    const avifBuffer = await image
      .avif({
        quality,
        effort: 4, // Balance between compression and speed
      })
      .toBuffer();

    return avifBuffer;
  } catch (error) {
    console.error("Error processing image:", error);
    throw new Error("Failed to process image");
  }
}

/**
 * Validate image file
 * @param buffer - Image buffer
 * @returns True if valid image
 */
export async function validateImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();

    // Check if it's a valid image format
    const validFormats = ["jpeg", "jpg", "png", "webp", "gif", "svg", "avif"];
    if (!metadata.format || !validFormats.includes(metadata.format)) {
      return false;
    }

    // Check file size (max 1MB)
    if (buffer.length > 1 * 1024 * 1024) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate unique filename
 * @param originalName - Original filename
 * @returns Unique filename with .avif extension
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const sanitizedName = originalName
    .replace(/\.[^/.]+$/, "") // Remove extension
    .replace(/[^a-z0-9]/gi, "-") // Replace special chars with dash
    .toLowerCase()
    .substring(0, 50); // Limit length

  return `${sanitizedName}-${timestamp}-${randomString}.avif`;
}

