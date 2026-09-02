"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Webhook as WebhookIcon } from "lucide-react";

export interface SafeWebhook {
  id: number;
  consumer: string;
  url: string;
  events: string[];
  active: boolean;
  cursor: string | Date | null;
  failureCount: number;
  lastDeliveryAt: string | Date | null;
  lastError: string | null;
  createdAt: string | Date | null;
  revokedAt: string | Date | null;
}

function fmt(d: string | Date | null): string {
  if (!d) return "—";
  return new Date(d).toISOString().replace("T", " ").slice(0, 16) + "Z";
}

export function WebhookManager({ initialWebhooks }: { initialWebhooks: SafeWebhook[] }) {
  const router = useRouter();
  const [hooks, setHooks] = useState<SafeWebhook[]>(initialWebhooks);
  const [createOpen, setCreateOpen] = useState(false);
  const [consumer, setConsumer] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [newSecret, setNewSecret] = useState<{ secret: string; url: string } | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/webhooks");
    if (res.ok) setHooks((await res.json()).data);
    router.refresh();
  }

  async function handleCreate() {
    if (!consumer.trim() || !url.trim()) return toast.error("Consumer and URL are required");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consumer: consumer.trim(), url: url.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to create webhook");
      setCreateOpen(false);
      setConsumer("");
      setUrl("");
      setNewSecret({ secret: body.data.secret, url: body.data.url });
      await refresh();
      toast.success("Webhook created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create webhook");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(w: SafeWebhook) {
    if (!confirm(`Revoke webhook to ${w.url}?`)) return;
    const res = await fetch(`/api/admin/webhooks/${w.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Webhook revoked");
      await refresh();
    } else {
      toast.error("Failed to revoke");
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied"),
      () => toast.error("Copy failed"),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add webhook
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Consumer</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Failures</TableHead>
              <TableHead>Last delivery</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hooks.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No webhooks yet.
                </TableCell>
              </TableRow>
            )}
            {hooks.map((w) => {
              const revoked = !!w.revokedAt;
              return (
                <TableRow key={w.id} className={revoked ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{w.consumer}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[280px] truncate" title={w.url}>{w.url}</TableCell>
                  <TableCell>
                    {revoked ? (
                      <Badge variant="secondary">revoked</Badge>
                    ) : w.active ? (
                      <Badge>active</Badge>
                    ) : (
                      <Badge variant="destructive">disabled</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums" title={w.lastError ?? ""}>
                    {w.failureCount > 0 ? <span className="text-destructive">{w.failureCount}</span> : 0}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(w.lastDeliveryAt)}</TableCell>
                  <TableCell className="text-right">
                    {!revoked && (
                      <Button variant="ghost" size="sm" onClick={() => handleRevoke(w)} title="Revoke">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add webhook</DialogTitle>
            <DialogDescription>Receives HMAC-signed POSTs of product changes. Secret shown once.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wh-consumer">Consumer</Label>
              <Input id="wh-consumer" placeholder="client-a" value={consumer} onChange={(e) => setConsumer(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-url">Endpoint URL (https)</Label>
              <Input id="wh-url" placeholder="https://consumer.example.com/webhook" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Events: <code>product.upsert</code>, <code>product.delete</code></p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handleCreate} disabled={busy} className="gap-2">
              <WebhookIcon className="h-4 w-4" /> Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Secret reveal */}
      <Dialog open={!!newSecret} onOpenChange={(o) => !o && setNewSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signing secret</DialogTitle>
            <DialogDescription>
              For <span className="font-mono text-xs">{newSecret?.url}</span>. Copy it now — it
              will <strong>not</strong> be shown again. Verify <code>X-Hicyou-Signature</code> with it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
            <code className="flex-1 break-all text-sm">{newSecret?.secret}</code>
            <Button size="sm" variant="outline" onClick={() => newSecret && copy(newSecret.secret)} className="shrink-0 gap-1">
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewSecret(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
