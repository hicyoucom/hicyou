// Aggregates for the admin API-usage panel (reads api_request_logs).
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export interface ConsumerUsage {
  consumer: string;
  total: number;
  c4xx: number;
  c5xx: number;
  p95Ms: number;
  lastAt: string | null;
}

export async function getApiUsage(days = 7): Promise<ConsumerUsage[]> {
  const rows = (await db.execute(sql`
    SELECT
      consumer,
      count(*)::int AS total,
      count(*) FILTER (WHERE status >= 400 AND status < 500)::int AS c4xx,
      count(*) FILTER (WHERE status >= 500)::int AS c5xx,
      coalesce(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms), 0)::int AS p95,
      max(created_at) AS last_at
    FROM api_request_logs
    WHERE created_at >= now() - make_interval(days => ${days})
    GROUP BY consumer
    ORDER BY total DESC
  `)) as unknown as Array<{
    consumer: string;
    total: number;
    c4xx: number;
    c5xx: number;
    p95: number;
    last_at: string | Date | null;
  }>;

  return rows.map((r) => ({
    consumer: r.consumer,
    total: Number(r.total),
    c4xx: Number(r.c4xx),
    c5xx: Number(r.c5xx),
    p95Ms: Number(r.p95),
    lastAt: r.last_at ? new Date(r.last_at).toISOString() : null,
  }));
}
