import { S3Client } from "@aws-sdk/client-s3";

// Validate environment variables
const requiredEnvVars = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

function validateR2Config(): boolean {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`Warning: ${envVar} is not set. R2 upload will not work.`);
      return false;
    }
  }
  return true;
}

// Check if R2 is configured
export const isR2Configured = validateR2Config();

// R2 Configuration
export const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID || "",
  accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  bucketName: process.env.R2_BUCKET_NAME || "",
  publicUrl: process.env.R2_PUBLIC_URL || "",
  uploadDir: process.env.R2_UPLOAD_DIR || "uploads",
  logoDir: process.env.R2_LOGO_DIR || "logos",
  coverDir: process.env.R2_COVER_DIR || "covers",
};

// Create S3 Client for R2
export const r2Client = isR2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
    })
  : null;

// Helper function to get full upload path
export function getR2Path(type: "logo" | "cover", filename: string): string {
  const dir = type === "logo" ? r2Config.logoDir : r2Config.coverDir;
  return `${r2Config.uploadDir}/${dir}/${filename}`;
}

// Helper function to get public URL
export function getR2PublicUrl(path: string): string {
  return `${r2Config.publicUrl}/${path}`;
}

