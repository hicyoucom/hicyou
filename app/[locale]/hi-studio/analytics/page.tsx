import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleAlert, Clock3, Send, ShieldCheck } from "lucide-react";
import { Container, Section } from "@/components/craft";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin-auth";
import { getSubmissionFunnel } from "@/lib/data/submission-funnel";
import {
  SUBMISSION_FUNNEL_WINDOWS,
  parseSubmissionFunnelWindow,
  type SubmissionFunnelWindow,
} from "@/lib/submission-funnel";

export const dynamic = "force-dynamic";

type AnalyticsPageProps = {
  searchParams: Promise<{ range?: string | string[] }>;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatRateDetail(
  value: number | null,
  description: string,
  unavailable: string,
): string {
  return value === null ? unavailable : `${formatPercent(value)} ${description}`;
}

function WindowLink({ days, active }: { days: SubmissionFunnelWindow; active: boolean }) {
  return (
    <Button asChild size="sm" variant={active ? "default" : "outline"}>
      <Link href={`/hi-studio/analytics?range=${days}`}>Last {days} days</Link>
    </Button>
  );
}

export default async function SubmissionAnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/");

  const { range } = await searchParams;
  const days = parseSubmissionFunnelWindow(range);
  const funnel = await getSubmissionFunnel(days);

  const stages = [
    {
      label: "Submitted",
      value: funnel.submitted,
      detail: "All submissions created in this cohort",
      icon: Send,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Decision recorded",
      value: funnel.decided,
      detail: formatRateDetail(
        funnel.decisionRate,
        "of submissions are published or rejected",
        "Not available until a submission exists",
      ),
      icon: CheckCircle2,
      tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Published",
      value: funnel.published,
      detail: formatRateDetail(
        funnel.publishRate,
        "of submitted",
        "Not available until a submission exists",
      ),
      icon: ShieldCheck,
      tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
  ];

  return (
    <Section>
      <Container>
        <div className="space-y-6 py-4">
          <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Button asChild className="-ml-3 gap-2" size="sm" variant="ghost">
                <Link href="/hi-studio">
                  <ArrowLeft className="h-4 w-4" />
                  Back to dashboard
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Submission Funnel</h1>
                <p className="mt-1 max-w-3xl text-muted-foreground">
                  Current lifecycle state of submissions created in the last {days} days. This is a cohort view,
                  not form-visit tracking.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Reporting window">
              {SUBMISSION_FUNNEL_WINDOWS.map((option) => (
                <WindowLink key={option} days={option} active={option === days} />
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Submitted</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{formatNumber(funnel.submitted)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Created in this cohort</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Decision rate</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{formatPercent(funnel.decisionRate)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {funnel.decisionRate === null
                  ? "Not available until a submission exists"
                  : "Published or rejected / submitted"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Publish rate</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{formatPercent(funnel.publishRate)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {funnel.publishRate === null ? "Not available until a submission exists" : "Published / submitted"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Approval rate</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{formatPercent(funnel.approvalRate)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {funnel.approvalRate === null
                  ? "Not available until a decision is recorded"
                  : "Published / decided"}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lifecycle conversion</CardTitle>
              <CardDescription>
                A submission is counted once, by its current lifecycle status. Decision rate is not a time-to-review SLA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-4 md:grid-cols-3">
                {stages.map(({ label, value, detail, icon: Icon, tone }, index) => (
                  <li key={label} className="relative rounded-lg border p-4">
                    {index < stages.length - 1 && (
                      <span className="absolute -right-3 top-1/2 hidden h-px w-6 bg-border md:block" aria-hidden />
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{index + 1}. {label}</p>
                        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatNumber(value)}</p>
                      </div>
                      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{detail}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Current queue and outcomes</CardTitle>
                <CardDescription>Breakdown of the same submitted cohort.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="flex items-center gap-2 text-sm"><Clock3 className="h-4 w-4 text-muted-foreground" />Pending review</span>
                  <Badge variant="secondary">{formatNumber(funnel.pending)}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">Verified / scheduled</span>
                  <Badge variant="secondary">{formatNumber(funnel.verified)}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">Published</span>
                  <Badge>{formatNumber(funnel.published)}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">Rejected</span>
                  <Badge variant="destructive">{formatNumber(funnel.rejected)}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data quality signals</CardTitle>
                <CardDescription>Quality indicators that do not alter the lifecycle funnel.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Badge-verified submissions</p>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <p className="text-3xl font-semibold tabular-nums">{formatNumber(funnel.badgeVerified)}</p>
                    <Badge variant="outline">{formatPercent(funnel.badgeVerificationRate)}</Badge>
                  </div>
                </div>
                {funnel.unclassified > 0 ? (
                  <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                    <p>
                      {formatNumber(funnel.unclassified)} submission{funnel.unclassified === 1 ? "" : "s"} use an
                      unrecognized lifecycle status and are excluded from the funnel stages above.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    All submissions in this cohort use a recognized lifecycle status.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground">
            Source: <code>submissions.created_at</code>, current <code>status</code>, and <code>badge_verified</code>.
            Form-view, form-start, and status-change timestamps are not persisted yet, so they are intentionally not shown.
          </p>
        </div>
      </Container>
    </Section>
  );
}
