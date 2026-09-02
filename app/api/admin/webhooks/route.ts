import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-error";
import { db } from "@/db/client";
import { webhooks } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { generateWebhookSecret, validateWebhookUrl } from "@/lib/webhooks";
import { encryptSecret } from "@/lib/webhook-crypto";
import { z } from "zod";

// Safe projection — NEVER return the signing secret.
const SAFE = {
  id: webhooks.id,
  consumer: webhooks.consumer,
  url: webhooks.url,
  events: webhooks.events,
  active: webhooks.active,
  cursor: webhooks.cursor,
  failureCount: webhooks.failureCount,
  lastDeliveryAt: webhooks.lastDeliveryAt,
  lastError: webhooks.lastError,
  createdAt: webhooks.createdAt,
  revokedAt: webhooks.revokedAt,
} as const;

const EVENT = z.enum(["product.upsert", "product.delete"]);

const createSchema = z.object({
  consumer: z.string().trim().min(1).max(64),
  url: z.string().url().max(2048),
  events: z
    .array(EVENT)
    .nonempty()
    .default(["product.upsert", "product.delete"]),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return jsonError("Unauthorized", auth.status);
  const data = await db
    .select(SAFE)
    .from(webhooks)
    .orderBy(desc(webhooks.createdAt));
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return jsonError("Unauthorized", auth.status);

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid body", 400, { details: parsed.error.flatten() });
  }
  const { consumer, url: submittedUrl, events } = parsed.data;

  let destination: URL;
  try {
    destination = await validateWebhookUrl(submittedUrl);
  } catch {
    return jsonError("Webhook URL host is not allowed", 400);
  }

  // Require https in production to avoid leaking signed payloads in cleartext.
  if (
    process.env.NODE_ENV === "production" &&
    destination.protocol !== "https:"
  ) {
    return jsonError("Webhook URL must be https", 400);
  }
  const url = destination.toString();

  const secret = generateWebhookSecret();
  // Store encrypted (or plaintext if WEBHOOK_SECRET_KEY unset); return plaintext once.
  const [row] = await db
    .insert(webhooks)
    .values({ consumer, url, secret: encryptSecret(secret), events })
    .returning(SAFE);

  logAdminAction({
    actorEmail: auth.email,
    action: "webhook.create",
    request,
    status: 201,
    targetType: "webhook",
    targetId: row.id,
    metadata: { consumer, url, events },
  });

  // Secret returned exactly once.
  return NextResponse.json({ data: { ...row, secret } }, { status: 201 });
}
