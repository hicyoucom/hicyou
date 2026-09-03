import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { webhooks, webhookDeliveries } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { Section, Container } from "@/components/craft";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WebhookManager, type SafeWebhook } from "@/components/admin/webhook-manager";

export const dynamic = "force-dynamic";

function fmtTs(d: Date | string | null): string {
  return d ? new Date(d).toISOString().replace("T", " ").slice(0, 19) + "Z" : "—";
}

export default async function WebhooksPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/");

  const rows = (await db
    .select({
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
    })
    .from(webhooks)
    .orderBy(desc(webhooks.createdAt))) as SafeWebhook[];

  const deliveries = await db
    .select({
      id: webhookDeliveries.id,
      consumer: webhooks.consumer,
      url: webhooks.url,
      eventCount: webhookDeliveries.eventCount,
      status: webhookDeliveries.status,
      httpStatus: webhookDeliveries.httpStatus,
      error: webhookDeliveries.error,
      createdAt: webhookDeliveries.createdAt,
    })
    .from(webhookDeliveries)
    .leftJoin(webhooks, eq(webhookDeliveries.webhookId, webhooks.id))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(25);

  return (
    <Section>
      <Container>
        <div className="space-y-6 py-4">
          <div className="border-b pb-6">
            <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
            <p className="text-muted-foreground mt-1">
              Push product changes to consumers. Each webhook receives HMAC-signed batches of{" "}
              <code>/api/v1/changes</code> events. The signing secret is shown once.
            </p>
          </div>
          <WebhookManager initialWebhooks={rows} />

          <div className="space-y-3 pt-4">
            <h2 className="text-xl font-semibold tracking-tight">Recent deliveries</h2>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consumer</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead className="text-right">Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">HTTP</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No deliveries yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {deliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.consumer ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[240px] truncate" title={d.url ?? ""}>{d.url ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{d.eventCount}</TableCell>
                      <TableCell>
                        {d.status === "success" ? (
                          <Badge>success</Badge>
                        ) : (
                          <Badge variant="destructive" title={d.error ?? ""}>failed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{d.httpStatus ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtTs(d.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
