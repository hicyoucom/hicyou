"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, KeyRound, RotateCw, Trash2, Plus } from "lucide-react";

export interface SafeToken {
  id: number;
  consumer: string;
  prefix: string;
  scopes: string[];
  rateLimitPerMin: number;
  lastUsedAt: string | Date | null;
  createdAt: string | Date | null;
  revokedAt: string | Date | null;
}

function fmt(d: string | Date | null): string {
  if (!d) return "—";
  return new Date(d).toISOString().slice(0, 10);
}

export function ApiTokenManager({ initialTokens }: { initialTokens: SafeToken[] }) {
  const router = useRouter();
  const [tokens, setTokens] = useState<SafeToken[]>(initialTokens);
  const [createOpen, setCreateOpen] = useState(false);
  const [consumer, setConsumer] = useState("");
  const [rate, setRate] = useState("60");
  const [busy, setBusy] = useState(false);
  const [newToken, setNewToken] = useState<{ token: string; consumer: string } | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/api-tokens");
    if (res.ok) setTokens((await res.json()).data);
    router.refresh();
  }

  async function handleCreate() {
    if (!consumer.trim()) return toast.error("Consumer name is required");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/api-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consumer: consumer.trim(), rateLimitPerMin: Number(rate) || 60 }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to create token");
      setCreateOpen(false);
      setConsumer("");
      setRate("60");
      setNewToken({ token: body.data.token, consumer: body.data.consumer });
      await refresh();
      toast.success("Token created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create token");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(t: SafeToken) {
    if (!confirm(`Revoke token ${t.prefix}… for "${t.consumer}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/api-tokens/${t.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Token revoked");
      await refresh();
    } else {
      toast.error("Failed to revoke");
    }
  }

  async function handleRotate(t: SafeToken) {
    if (!confirm(`Rotate token for "${t.consumer}"? The old token is revoked immediately.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/api-tokens/${t.id}/rotate`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to rotate");
      setNewToken({ token: body.data.token, consumer: body.data.consumer });
      await refresh();
      toast.success("Token rotated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to rotate");
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Copy failed"),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create token
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Consumer</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Scopes</TableHead>
              <TableHead className="text-right">Rate/min</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No tokens yet.
                </TableCell>
              </TableRow>
            )}
            {tokens.map((t) => {
              const revoked = !!t.revokedAt;
              return (
                <TableRow key={t.id} className={revoked ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{t.consumer}</TableCell>
                  <TableCell className="font-mono text-xs">{t.prefix}…</TableCell>
                  <TableCell className="text-xs">{t.scopes?.join(", ")}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.rateLimitPerMin}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(t.lastUsedAt)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmt(t.createdAt)}</TableCell>
                  <TableCell>
                    {revoked ? <Badge variant="secondary">revoked</Badge> : <Badge>active</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {!revoked && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" disabled={busy} onClick={() => handleRotate(t)} title="Rotate">
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" disabled={busy} onClick={() => handleRevoke(t)} title="Revoke">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
            <DialogTitle>Create API token</DialogTitle>
            <DialogDescription>The plaintext token is shown once after creation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="consumer">Consumer</Label>
              <Input id="consumer" placeholder="client-a" value={consumer} onChange={(e) => setConsumer(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rate">Rate limit (requests / minute)</Label>
              <Input id="rate" type="number" min={1} value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Scope: <code>read:products</code></p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={busy} className="gap-2">
              <KeyRound className="h-4 w-4" /> Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-time token reveal */}
      <Dialog open={!!newToken} onOpenChange={(o) => !o && setNewToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token for &quot;{newToken?.consumer}&quot;</DialogTitle>
            <DialogDescription>
              Copy it now — it will <strong>not</strong> be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
            <code className="flex-1 break-all text-sm">{newToken?.token}</code>
            <Button size="sm" variant="outline" onClick={() => newToken && copy(newToken.token)} className="shrink-0 gap-1">
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewToken(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
