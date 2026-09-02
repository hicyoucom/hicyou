// Outbound webhook delivery. Each webhook walks the /changes feed from its own
// `cursor` (a timestamp lower bound); the cron drains all due pages and POSTs
// HMAC-signed batches. Delivery is at-least-once (cursor only advances after a
// fully successful drain, and never regresses), so consumers must dedupe by
// product source_id. After too many consecutive failures a webhook auto-disables.
import { randomBytes, createHmac, randomUUID } from "node:crypto";
import { sql, and, eq, isNull, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { webhooks, webhookDeliveries, type Webhook } from "@/db/schema";
import { listChanges, type ChangeEntry } from "@/lib/data/products";
import { decryptSecret } from "@/lib/webhook-crypto";

const BATCH = 200;
const MAX_PAGES = 25;             // ≤ 5000 changes per webhook per run
const MAX_WEBHOOKS_PER_RUN = 50;  // bound fan-out / runtime per cron tick
const MAX_FAILURES = 15;          // consecutive failures before auto-disable
const TIMEOUT_MS = 8000;
const CURSOR_OVERLAP_MS = 60_000;

export function webhookCursorAdvanceTo(options: {
  runStart: Date;
  drained: boolean;
  lastTs: string | null;
  currentCursor: Date;
}): string {
  if (options.drained) {
    return new Date(options.runStart.getTime() - CURSOR_OVERLAP_MS).toISOString();
  }
  return options.lastTs ?? options.currentCursor.toISOString();
}

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

/** Stripe-style signature over `${timestamp}.${body}`. */
export function signPayload(secret: string, body: string, timestamp: number): string {
  const mac = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${mac}`;
}

/**
 * SSRF guard: reject loopback/private/link-local/metadata hosts so an admin
 * (or a mistaken paste) can't point a webhook at internal infrastructure.
 * Host-literal based; deployments behind split-horizon DNS should add their own
 * egress controls for full protection.
 */
export function isBlockedWebhookHost(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return true;
  }
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".internal") || h.endsWith(".local")) return true;
  if (/^127\./.test(h) || h === "0.0.0.0") return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}

function changeEvent(c: ChangeEntry): string {
  return c.type === "delete" ? "product.delete" : "product.upsert";
}

// Effective change timestamp (matches the feed's keyset ordering): delete uses
// deleted_at, upsert uses updated_at. ISO strings, so string max == time max.
function changeEffectiveTs(c: ChangeEntry): string {
  return c.type === "delete" ? c.deleted_at : c.updated_at;
}

async function recordDelivery(
  webhookId: number,
  eventCount: number,
  status: "success" | "failed",
  httpStatus: number | null,
  error: string | null,
): Promise<void> {
  try {
    await db.insert(webhookDeliveries).values({ webhookId, eventCount, status, httpStatus, error });
  } catch (err) {
    console.error("[webhooks] delivery log insert failed:", err);
  }
}

async function postBatch(wh: Webhook, events: ChangeEntry[]): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000);
  const deliveryId = randomUUID();
  const body = JSON.stringify({ delivery_id: deliveryId, delivered_at: new Date().toISOString(), events });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let httpStatus: number | null = null;
  try {
    // Inside try so a decrypt/key-config failure also records a delivery row.
    const signature = signPayload(decryptSecret(wh.secret), body, timestamp);
    const res = await fetch(wh.url, {
      method: "POST",
      redirect: "manual", // never follow redirects — defeats the SSRF host check
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "hicyou-webhooks/1.0",
        "X-Hicyou-Signature": signature,
        "X-Hicyou-Delivery": deliveryId,
        "X-Hicyou-Event-Count": String(events.length),
      },
      body,
      signal: ctrl.signal,
    });
    httpStatus = res.status;
    if (!res.ok) throw new Error(`HTTP ${res.status}`); // 3xx (manual redirect) also fails here
    await recordDelivery(wh.id, events.length, "success", httpStatus, null);
  } catch (err) {
    await recordDelivery(wh.id, events.length, "failed", httpStatus, err instanceof Error ? err.message : String(err));
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Drain every due page for one webhook, advancing the cursor only on full success. */
async function deliverOne(wh: Webhook): Promise<"sent" | "empty"> {
  if (isBlockedWebhookHost(wh.url)) throw new Error("blocked host (SSRF guard)");

  const runStart = new Date();
  let cursorTok: string | null = null;
  let pages = 0;
  let sentAny = false;
  let lastTs: string | null = null; // effective ts of the last change consumed
  let drained = false;

  for (;;) {
    const page = await listChanges(wh.cursor, cursorTok, BATCH);
    // We page past ALL of page.data (subscribed or not), so the cursor covers it.
    if (page.data.length > 0) lastTs = changeEffectiveTs(page.data[page.data.length - 1]);
    const events = page.data.filter((c) => wh.events.includes(changeEvent(c)));
    if (events.length > 0) {
      await postBatch(wh, events); // throws → caller records failure, cursor not advanced
      sentAny = true;
    }
    cursorTok = page.nextCursor;
    pages++;
    if (!page.hasMore) {
      drained = true;
      break;
    }
    if (pages >= MAX_PAGES) break; // capped — more changes remain
  }

  // Drained → retain a one-minute overlap for transactions that began before
  // the scan but committed during it. Capped → advance only to the last change
  // actually consumed, so remaining pages aren't skipped next run. Delivery
  // is intentionally at-least-once; consumers apply events idempotently by
  // (type, source_id, updated_at/deleted_at), not source_id alone.
  // Monotonic GREATEST guards against a concurrent run regressing the cursor.
  // ISO string + cast (raw Date in sql`` fails under postgres-js prepare:false).
  const advanceTo = webhookCursorAdvanceTo({
    runStart,
    drained,
    lastTs,
    currentCursor: wh.cursor,
  });
  await db
    .update(webhooks)
    .set({
      cursor: sql`GREATEST(${webhooks.cursor}, ${advanceTo}::timestamp)`,
      failureCount: 0,
      lastDeliveryAt: new Date(),
      lastError: null,
    })
    .where(eq(webhooks.id, wh.id));

  return sentAny ? "sent" : "empty";
}

async function processWebhook(wh: Webhook): Promise<"sent" | "empty" | "failed"> {
  try {
    return await deliverOne(wh);
  } catch (err) {
    const nextFailures = wh.failureCount + 1;
    await db
      .update(webhooks)
      .set({
        failureCount: nextFailures,
        lastDeliveryAt: new Date(),
        lastError: err instanceof Error ? err.message : String(err),
        active: nextFailures >= MAX_FAILURES ? false : wh.active, // auto-disable
      })
      .where(eq(webhooks.id, wh.id));
    return "failed";
  }
}

export interface DeliverySummary {
  processed: number;
  sent: number;
  empty: number;
  failed: number;
}

/** Drain due changes for active webhooks (oldest cursor first, capped). */
export async function deliverDueWebhooks(): Promise<DeliverySummary> {
  const active = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.active, true), isNull(webhooks.revokedAt)))
    .orderBy(asc(webhooks.cursor))
    .limit(MAX_WEBHOOKS_PER_RUN);

  const summary: DeliverySummary = { processed: 0, sent: 0, empty: 0, failed: 0 };
  for (const wh of active) {
    summary.processed++;
    summary[await processWebhook(wh)]++;
  }
  return summary;
}
