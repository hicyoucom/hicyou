import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-error";
import { db } from "@/db/client";
import { webhooks } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

// Revoke a webhook (idempotent): deactivate + stamp revoked_at.
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return jsonError("Unauthorized", auth.status);

  const idParse = idSchema.safeParse((await props.params).id);
  if (!idParse.success) return jsonError("Invalid id", 400);
  const id = idParse.data;

  const [revoked] = await db
    .update(webhooks)
    .set({ active: false, revokedAt: new Date() })
    .where(and(eq(webhooks.id, id), isNull(webhooks.revokedAt)))
    .returning({ id: webhooks.id, consumer: webhooks.consumer, url: webhooks.url });

  if (!revoked) {
    const [exists] = await db.select({ id: webhooks.id }).from(webhooks).where(eq(webhooks.id, id)).limit(1);
    if (exists) return NextResponse.json({ message: "Webhook already revoked" });
    return jsonError("Webhook not found", 404);
  }

  logAdminAction({
    actorEmail: auth.email,
    action: "webhook.revoke",
    request,
    status: 200,
    targetType: "webhook",
    targetId: id,
    metadata: { consumer: revoked.consumer, url: revoked.url },
  });

  return NextResponse.json({ message: "Webhook revoked" });
}
