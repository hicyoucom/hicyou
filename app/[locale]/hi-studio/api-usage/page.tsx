import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getApiUsage } from "@/lib/data/api-usage";
import { Section, Container } from "@/components/craft";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

function fmt(d: string | null): string {
  return d ? new Date(d).toISOString().replace("T", " ").slice(0, 16) + "Z" : "—";
}

export default async function ApiUsagePage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/");

  const usage = await getApiUsage(7);
  const totals = usage.reduce(
    (a, u) => ({ total: a.total + u.total, c4xx: a.c4xx + u.c4xx, c5xx: a.c5xx + u.c5xx }),
    { total: 0, c4xx: 0, c5xx: 0 },
  );

  return (
    <Section>
      <Container>
        <div className="space-y-6 py-4">
          <div className="border-b pb-6">
            <h1 className="text-3xl font-bold tracking-tight">API Usage</h1>
            <p className="text-muted-foreground mt-1">
              Public Directory API (<code>/api/v1</code>) — last 7 days. {totals.total} requests,{" "}
              {totals.c4xx} client errors, {totals.c5xx} server errors.
            </p>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Consumer</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">4xx</TableHead>
                  <TableHead className="text-right">5xx</TableHead>
                  <TableHead className="text-right">Error rate</TableHead>
                  <TableHead className="text-right">p95</TableHead>
                  <TableHead>Last request</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No API traffic in the last 7 days.
                    </TableCell>
                  </TableRow>
                )}
                {usage.map((u) => {
                  const errRate = u.total ? ((u.c4xx + u.c5xx) / u.total) * 100 : 0;
                  return (
                    <TableRow key={u.consumer}>
                      <TableCell className="font-medium">{u.consumer}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.total}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.c4xx}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.c5xx}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {errRate > 5 ? (
                          <Badge variant="destructive">{errRate.toFixed(1)}%</Badge>
                        ) : (
                          <span className="text-muted-foreground">{errRate.toFixed(1)}%</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{u.p95Ms} ms</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmt(u.lastAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Only authenticated requests are metered; unauthenticated/failed-auth requests are not recorded.
          </p>
        </div>
      </Container>
    </Section>
  );
}
