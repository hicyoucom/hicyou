import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  FileText,
  Plus,
} from "lucide-react";
import { getSession } from "@/lib/get-session";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { getPublisherDashboard } from "@/lib/data/publisher-dashboard";
import { TopNav } from "@/components/top-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  params: Promise<{ locale: Locale }>;
};

function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(locale).format(value);
}

function formatPercent(locale: Locale, value: number | null): string {
  if (value === null) return "—";

  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export default async function PublisherDashboardPage({ params }: Props) {
  const [{ locale }, session] = await Promise.all([params, getSession()]);
  const user = session?.user;

  if (!user) {
    return redirect({ href: "/login?next=/account/publisher", locale });
  }

  const [t, dashboard] = await Promise.all([
    getTranslations("publisherDashboard"),
    getPublisherDashboard(user.id),
  ]);
  const { summary } = dashboard;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const publicationRate = formatPercent(locale, summary.publicationRate);
  const publicationRateWidth = Math.min(
    100,
    Math.max(0, (summary.publicationRate ?? 0) * 100),
  );

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-8 shadow-sm sm:px-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.14),transparent_68%)] lg:block" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("title")}
              </h1>
              <p className="text-muted-foreground">{t("description")}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/submit/status">
                  <FileText className="h-4 w-4" />
                  {t("viewSubmissions")}
                </Link>
              </Button>
              <Button asChild>
                <Link href="/submit">
                  <Plus className="h-4 w-4" />
                  {t("newSubmission")}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section
          className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label={t("summaryLabel")}
        >
          <MetricCard
            icon={<ChartNoAxesCombined className="h-4 w-4" />}
            label={t("summary.liveListings.label")}
            description={t("summary.liveListings.description")}
            value={formatNumber(locale, summary.liveListings)}
          />
          <MetricCard
            icon={<Clock3 className="h-4 w-4" />}
            label={t("summary.inReview.label")}
            description={t("summary.inReview.description")}
            value={formatNumber(locale, summary.inReview)}
          />
          <MetricCard
            icon={<BadgeCheck className="h-4 w-4" />}
            label={t("summary.dofollowListings.label")}
            description={t("summary.dofollowListings.description")}
            value={formatNumber(locale, summary.dofollowListings)}
          />
          <MetricCard
            icon={<FileText className="h-4 w-4" />}
            label={t("summary.last30Days.label")}
            description={t("summary.last30Days.description")}
            value={formatNumber(locale, summary.submissionsLast30Days)}
          />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>{t("outcomes.title")}</CardTitle>
              <CardDescription>{t("outcomes.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("outcomes.publicationRate")}
                  </p>
                  <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
                    {publicationRate}
                  </p>
                </div>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {summary.decidedSubmissions > 0
                    ? t("outcomes.rateExplanation", {
                        published: formatNumber(
                          locale,
                          summary.publishedSubmissions,
                        ),
                        decided: formatNumber(locale, summary.decidedSubmissions),
                      })
                    : t("outcomes.noDecisions")}
                </p>
              </div>
              <div
                aria-label={t("outcomes.publicationRate")}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={
                  summary.publicationRate === null
                    ? undefined
                    : Math.round(publicationRateWidth)
                }
                aria-valuetext={publicationRate}
                className="mt-5 h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${publicationRateWidth}%` }}
                />
              </div>
              <dl className="mt-6 grid grid-cols-3 gap-3 border-t pt-5">
                <OutcomeMetric
                  label={t("outcomes.decided")}
                  value={formatNumber(locale, summary.decidedSubmissions)}
                />
                <OutcomeMetric
                  label={t("outcomes.published")}
                  value={formatNumber(locale, summary.publishedSubmissions)}
                />
                <OutcomeMetric
                  label={t("outcomes.notPublished")}
                  value={formatNumber(locale, summary.rejectedSubmissions)}
                />
              </dl>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>{t("attention.title")}</CardTitle>
              <CardDescription>{t("attention.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.badgeVerificationNeeded > 0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="flex gap-3">
                    <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-medium">
                        {t("attention.badgeRequired.title", {
                          count: summary.badgeVerificationNeeded,
                        })}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("attention.badgeRequired.description")}
                      </p>
                    </div>
                  </div>
                  <Button asChild className="mt-4" size="sm" variant="outline">
                    <Link href="/submit/status">
                      {t("attention.openSubmissions")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-medium">{t("attention.clear.title")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("attention.clear.description")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <p className="mt-4 text-sm text-muted-foreground">
                {t("attention.badgeVerified", {
                  count: summary.badgeVerifiedSubmissions,
                })}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">{t("liveListings.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("liveListings.description", {
                  count: formatNumber(locale, summary.liveListings),
                })}
              </p>
            </div>
            {summary.liveListings > 0 ? (
              <Button asChild size="sm" variant="ghost">
                <Link href="/submit/status">
                  {t("liveListings.viewAll")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>

          {dashboard.liveListings.length === 0 ? (
            <Card className="mt-5 border-dashed shadow-none">
              <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{t("liveListings.empty.title")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("liveListings.empty.description")}
                  </p>
                </div>
                <Button asChild className="shrink-0" size="sm">
                  <Link href="/submit">{t("liveListings.empty.action")}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.liveListings.map((listing) => (
                <Card key={listing.id} className="group shadow-none">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{listing.title}</p>
                      </div>
                      <Badge className="shrink-0" variant="outline">
                        {t("liveListings.live")}
                      </Badge>
                    </div>
                    {listing.description ? (
                      <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
                        {listing.description}
                      </p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                      <p className="text-xs text-muted-foreground">
                        {listing.publishedAt
                          ? t("liveListings.publishedAt", {
                              date: dateFormatter.format(listing.publishedAt),
                            })
                          : t("liveListings.published")}
                      </p>
                      <Button asChild className="shrink-0" size="sm" variant="ghost">
                        <Link href={`/${encodeURIComponent(listing.slug)}`}>
                          {t("liveListings.view")}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <Card className="mt-8 border-sky-500/20 bg-sky-500/5 shadow-none">
          <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
            <ChartNoAxesCombined className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
            <p>{t("dataScope")}</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  description,
  value,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  value: string;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-primary">{icon}</span>
          <p>{label}</p>
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function OutcomeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
