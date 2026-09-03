import { logger } from "@/lib/logger";
/**
 * Cloudflare Turnstile verification utilities
 */

// Cloudflare's documented test credentials accept any hostname, which keeps
// localhost/LAN previews usable without weakening production verification.
const TURNSTILE_SECRET =
  process.env.NODE_ENV === "development"
    ? "1x0000000000000000000000000000000AA"
    : process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_ENABLED = !!TURNSTILE_SECRET;

export function isTurnstileRequired(
  raw = process.env.TURNSTILE_REQUIRED,
): boolean {
  return !["0", "false", "off", "no"].includes(
    raw?.trim().toLowerCase() ?? "true",
  );
}

export function isTurnstileEnabled(): boolean {
  return TURNSTILE_ENABLED;
}

export interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verify Turnstile token
 * @param token The token from the client-side Turnstile widget
 * @param ip Optional IP address of the user
 * @returns Verification result
 */
export async function verifyTurnstile(
  token: string,
  ip?: string
): Promise<{ success: boolean; error?: string }> {
  // Local development and an explicit production opt-out may skip the
  // service. Production otherwise fails closed; the container preflight
  // catches this configuration error before the application starts.
  if (!TURNSTILE_ENABLED) {
    if (process.env.NODE_ENV === "production" && isTurnstileRequired()) {
      logger.error("Turnstile is not configured in production");
      return { success: false, error: "Verification service is unavailable" };
    }
    logger.info("Turnstile not configured, skipping verification");
    return { success: true };
  }

  if (!token) {
    return { success: false, error: "Turnstile token is required" };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", TURNSTILE_SECRET!);
    formData.append("response", token);
    if (ip) {
      formData.append("remoteip", ip);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const data: TurnstileVerifyResponse = await response.json();

    if (!data.success) {
      logger.error("Turnstile verification failed:", data["error-codes"]);
      return {
        success: false,
        error: "Verification failed. Please try again.",
      };
    }

    return { success: true };
  } catch (error) {
    logger.error("Error verifying Turnstile:", error);
    return {
      success: false,
      error: "Verification error. Please try again.",
    };
  }
}
