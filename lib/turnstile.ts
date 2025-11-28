/**
 * Cloudflare Turnstile verification utilities
 */

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_ENABLED = !!TURNSTILE_SECRET;

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
  // If Turnstile is not configured, skip verification
  if (!TURNSTILE_ENABLED) {
    console.log("Turnstile not configured, skipping verification");
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
      console.error("Turnstile verification failed:", data["error-codes"]);
      return {
        success: false,
        error: "Verification failed. Please try again.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error verifying Turnstile:", error);
    return {
      success: false,
      error: "Verification error. Please try again.",
    };
  }
}

