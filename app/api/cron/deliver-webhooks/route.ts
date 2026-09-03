import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { deliverDueWebhooks } from "@/lib/webhooks";

// 强制动态渲染（读取 request.headers 鉴权）
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/cron/deliver-webhooks
 * Drains the /changes feed for each active webhook and POSTs signed batches.
 * Auth: Authorization: Bearer <CRON_SECRET>. Run every few minutes
 * (Vercel Cron / Zeabur / external cron-job.org).
 */
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await deliverDueWebhooks();
  return NextResponse.json({ ok: true, ...summary });
}
