import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { apiRequestLogs, rateLimits, webhookDeliveries } from "@/db/schema";
import { lt } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";

// 强制动态渲染（读取 request.headers 鉴权）
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RETENTION_DAYS = 90;
const RATE_LIMIT_RETENTION_DAYS = 7;

/**
 * GET /api/cron/prune-logs
 * Deletes api_request_logs / webhook_deliveries older than RETENTION_DAYS so the
 * observability tables don't grow unbounded. Auth: Bearer <CRON_SECRET>. Daily.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const rateLimitCutoff = new Date(
    Date.now() - RATE_LIMIT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  const prunedApiLogs = await db
    .delete(apiRequestLogs)
    .where(lt(apiRequestLogs.createdAt, cutoff))
    .returning({ id: apiRequestLogs.id });

  const prunedDeliveries = await db
    .delete(webhookDeliveries)
    .where(lt(webhookDeliveries.createdAt, cutoff))
    .returning({ id: webhookDeliveries.id });

  const prunedRateLimits = await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, rateLimitCutoff))
    .returning({ id: rateLimits.id });

  return NextResponse.json({
    ok: true,
    retention_days: RETENTION_DAYS,
    cutoff: cutoff.toISOString(),
    deleted: {
      api_request_logs: prunedApiLogs.length,
      webhook_deliveries: prunedDeliveries.length,
      rate_limits: prunedRateLimits.length,
    },
  });
}
