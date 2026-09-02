import { logger } from "@/lib/logger";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { captcha, magicLink } from "better-auth/plugins";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { getTrustedAuthIpHeaders } from "@/lib/auth-ip";
import { escapeEmailHtml, getMailFrom } from "@/lib/mail-config";

// Keep the Drizzle adapter version aligned with package.json and the
// production migration dependency installed in Dockerfile.

const socialProviders: Record<
  string,
  { clientId: string; clientSecret: string }
> = {};
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}

const isDevelopment = process.env.NODE_ENV === "development";
const turnstileSecretKey = isDevelopment
  ? "1x0000000000000000000000000000000AA"
  : process.env.TURNSTILE_SECRET_KEY;
const turnstileSiteKey = isDevelopment
  ? "1x00000000000000000000AA"
  : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const isAuthCaptchaEnabled = !!(turnstileSecretKey && turnstileSiteKey);
const trustedAuthIpHeaders = getTrustedAuthIpHeaders();

const authPlugins = [
  ...(isAuthCaptchaEnabled
    ? [
        captcha({
          provider: "cloudflare-turnstile",
          secretKey: turnstileSecretKey!,
          endpoints: ["/sign-in/magic-link", "/sign-in/social"],
        }),
      ]
    : []),
  magicLink({
    sendMagicLink: async ({ email, url }) => {
      // Use Resend directly since sendEmail helper requires React components
      if (!process.env.MAIL_KEY) {
        logger.warn("MAIL_KEY is not set, skipping magic link email");
        return;
      }
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.MAIL_KEY);
      const safeUrl = escapeEmailHtml(url);
      await resend.emails.send({
        from: getMailFrom(),
        to: email,
        subject: "Sign in to HiCyou",
        html: `<p>Click the link below to sign in:</p><p><a href="${safeUrl}">Sign in to HiCyou</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
      });
    },
  }),
];

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // Only configure a single-value header that the deployment proxy
  // overwrites. This keeps Better Auth's per-IP rate limit from falling
  // back to a shared bucket without trusting a spoofable proxy chain.
  advanced: trustedAuthIpHeaders
    ? {
        ipAddress: {
          ipAddressHeaders: trustedAuthIpHeaders,
        },
      }
    : undefined,
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Refresh session expiry every 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache session in cookie for 5 minutes to reduce DB lookups
    },
  },
  emailAndPassword: { enabled: false },
  socialProviders,
  plugins: authPlugins,
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["github", "google"],
    },
  },
});
