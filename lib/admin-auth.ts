import { logger } from "@/lib/logger";
import { getSession } from "@/lib/get-session";
import { db } from "@/db/client";
import { adminAuditLogs } from "@/db/schema";
import { getClientIp } from "@/lib/rate-limit";

let cachedAdminEmails: string[] | null = null;

export function getAdminEmails(): string[] {
  if (cachedAdminEmails) return cachedAdminEmails;
  const raw = process.env.ADMIN_EMAILS ?? "";
  cachedAdminEmails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return cachedAdminEmails;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = getAdminEmails();
  if (list.length === 0) return false;
  return list.includes(email.toLowerCase());
}

export async function requireAdmin(): Promise<
  | { ok: true; email: string }
  | { ok: false; status: 401 | 403 }
> {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return { ok: false, status: 401 };
  if (!isAdminEmail(email)) return { ok: false, status: 403 };
  return { ok: true, email };
}

export interface AdminAuditEntry {
  actorEmail: string;
  action: string;
  request: Request;
  status: number;
  targetType?: string | null;
  targetId?: string | number | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Fire-and-forget audit logger for admin operations. Failures are swallowed
 * to avoid impacting business responses; check server logs if entries go missing.
 */
export function logAdminAction(entry: AdminAuditEntry): void {
  const url = (() => {
    try {
      return new URL(entry.request.url);
    } catch {
      return null;
    }
  })();
  const path = url ? url.pathname : "";
  const ip = (() => {
    try {
      return getClientIp(entry.request);
    } catch {
      return null;
    }
  })();
  const userAgent = entry.request.headers.get("user-agent");

  void db
    .insert(adminAuditLogs)
    .values({
      actorEmail: entry.actorEmail,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId:
        entry.targetId === undefined || entry.targetId === null
          ? null
          : String(entry.targetId),
      method: entry.request.method,
      path,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      status: entry.status,
      metadata: entry.metadata ?? null,
    })
    .catch((err) => {
      logger.error("[admin-audit] insert failed:", err);
    });
}
