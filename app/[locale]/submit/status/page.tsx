import { getTranslations } from "next-intl/server";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  Plus,
  XCircle,
} from "lucide-react";
import { getSession } from "@/lib/get-session";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { getSubmissionStatusCenter } from "@/lib/data/submission-status-center";
import {
  getSubmissionStatusKind,
  parseSubmissionStatusCenterPage,
  parseSubmissionStatusFilter,
  type SubmissionStatusFilter,
  type SubmissionStatusKind,
} from "@/lib/submission-status";
import { TopNav } from "@/components/top-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    status?: string | string[];
    page?: string | string[];
  }>;
};

function statusCenterHref(status: SubmissionStatusFilter, page = 1): string {
  const searchParams = new URLSearchParams();
  if (status !== "all") searchParams.set("status", status);
  if (page > 1) searchParams.set("page", String(page));

  const query = searchParams.toString();
  return query ? `/submit/status?${query}` : "/submit/status";
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

function getInitial(title: string): string {
  return Array.from(title.trim())[0]?.toUpperCase() ?? "?";
}

function StatusBadge({
  kind,
  label,
}: {
  kind: SubmissionStatusKind;
  label: string;
}) {
  switch (kind) {
    case "published":
      return (
        <Badge className="gap-1.5" variant="default">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {label}
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="gap-1.5" variant="destructive">
          <XCircle className="h-3.5 w-3.5" />
          {label}
        </Badge>
      );
    case "verified":
      return (
        <Badge
          className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          variant="outline"
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          {label}
        </Badge>
      );
    case "pending":
      return (
        <Badge className="gap-1.5" variant="secondary">
          <Clock3 className="h-3.5 w-3.5" />
          {label}
        </Badge>
      );
    default:
      return (
        <Badge className="gap-1.5" variant="outline">
          <CircleAlert className="h-3.5 w-3.5" />
          {label}
        </Badge>
      );
  }
}

export default async function SubmissionStatusCenterPage({
  params,
  searchParams,
}: Props) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const session = await getSession();
  const user = session?.user;

  if (!user) {
    return redirect({ href: "/login?next=/submit/status", locale });
  }

  const status = parseSubmissionStatusFilter(query.status);
  const page = parseSubmissionStatusCenterPage(query.page);
  const [t, center] = await Promise.all([
    getTranslations("submissionStatus"),
    getSubmissionStatusCenter(user.id, { status, page }),
  ]);

  if (center.page !== page) {
    return redirect({ href: statusCenterHref(status, center.page), locale });
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formatDate = (date: Date) => dateFormatter.format(date);
  const statusLabels: Record<SubmissionStatusKind, string> = {
    pending: t("status.pending.label"),
    verified: t("status.verified.label"),
    published: t("status.published.label"),
    rejected: t("status.rejected.label"),
    unknown: t("status.unknown.label"),
  };
  const filters: Array<{
    status: SubmissionStatusFilter;
    label: string;
    count: number;
  }> = [
    { status: "all", label: t("filters.all"), count: center.counts.total },
    {
      status: "pending",
      label: t("filters.pending"),
      count: center.counts.pending,
    },
    {
      status: "verified",
      label: t("filters.verified"),
      count: center.counts.verified,
    },
    {
      status: "published",
      label: t("filters.published"),
      count: center.counts.published,
    },
    {
      status: "rejected",
      label: t("filters.rejected"),
      count: center.counts.rejected,
    },
  ];
  const inReview = center.counts.pending + center.counts.verified;

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-8 shadow-sm sm:px-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_65%)] lg:block" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("title")}
              </h1>
              <p className="text-muted-foreground">{t("description")}</p>
            </div>
            <Button asChild className="shrink-0 gap-2">
              <Link href="/submit">
                <Plus className="h-4 w-4" />
                {t("newSubmission")}
              </Link>
            </Button>
          </div>
        </section>

        <section
          className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          aria-label={t("summaryLabel")}
        >
          <Card className="shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                {t("summary.total")}
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {center.counts.total}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                {t("summary.inReview")}
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {inReview}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                {t("summary.published")}
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {center.counts.published}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                {t("summary.notPublished")}
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {center.counts.rejected}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8" aria-labelledby="submission-list-title">
          <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="submission-list-title" className="text-xl font-semibold">
                {t("listTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("totalCount", { count: center.total })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2" aria-label={t("filterLabel")}>
              {filters.map((filter) => (
                <Button
                  key={filter.status}
                  asChild
                  aria-current={status === filter.status ? "page" : undefined}
                  size="sm"
                  variant={status === filter.status ? "default" : "outline"}
                >
                  <Link href={statusCenterHref(filter.status)}>
                    {filter.label}
                    <span className="ml-1 tabular-nums opacity-75">
                      {filter.count}
                    </span>
                  </Link>
                </Button>
              ))}
            </div>
          </div>

          {center.counts.unclassified > 0 ? (
            <p className="mt-4 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
              {t("unclassifiedNotice", { count: center.counts.unclassified })}
            </p>
          ) : null}

          {center.entries.length === 0 ? (
            <Card className="mt-5 border-dashed shadow-none">
              <CardContent className="flex flex-col items-center px-6 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  {status === "all"
                    ? t("empty.title")
                    : t("empty.filteredTitle", {
                        status: statusLabels[status],
                      })}
                </h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  {status === "all"
                    ? t("empty.description")
                    : t("empty.filteredDescription")}
                </p>
                {status === "all" ? (
                  <Button asChild className="mt-5 gap-2">
                    <Link href="/submit">
                      <Plus className="h-4 w-4" />
                      {t("empty.action")}
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="mt-5" variant="outline">
                    <Link href={statusCenterHref("all")}>
                      {t("empty.clearFilter")}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="mt-5 space-y-4">
              {center.entries.map((submission) => {
                const kind = getSubmissionStatusKind(submission.status);
                const canVerifyBadge =
                  !submission.badgeVerified &&
                  kind !== "published" &&
                  kind !== "rejected";
                const statusDescription =
                  kind === "pending"
                    ? t("status.pending.description")
                    : kind === "verified"
                      ? t("status.verified.description")
                      : kind === "published"
                        ? t("status.published.description")
                        : kind === "rejected"
                          ? t("status.rejected.description")
                          : t("status.unknown.description");

                return (
                  <article
                    key={submission.id}
                    className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-col gap-5 p-5 sm:p-6">
                      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-muted text-base font-semibold text-muted-foreground">
                            {getInitial(submission.title)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-lg font-semibold">
                                {submission.title}
                              </h3>
                              <StatusBadge
                                kind={kind}
                                label={statusLabels[kind]}
                              />
                            </div>
                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {getHostname(submission.url)}
                            </p>
                            {submission.tagline ? (
                              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                                {submission.tagline}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {submission.publicListingSlug ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/${submission.publicListingSlug}`}>
                                {t("viewListing")}
                                <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          ) : null}
                          <Button asChild size="sm">
                            <Link href={`/submit/${submission.id}`}>
                              {t("viewDetails")}
                            </Link>
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 border-t pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
                        <div>
                          <p className="text-sm font-medium">
                            {statusDescription}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            <span>
                              {t("meta.submitted", {
                                date: formatDate(submission.createdAt),
                              })}
                            </span>
                            <span>
                              {t("meta.updated", {
                                date: formatDate(submission.updatedAt),
                              })}
                            </span>
                            {kind === "verified" && submission.publishAt ? (
                              <span className="inline-flex items-center gap-1.5 text-foreground">
                                <CalendarClock className="h-3.5 w-3.5" />
                                {t("meta.scheduled", {
                                  date: formatDate(submission.publishAt),
                                })}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-lg bg-muted/60 px-4 py-3 text-sm">
                          {submission.badgeVerified ? (
                            <div className="flex gap-2">
                              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              <div>
                                <p className="font-medium">
                                  {t("badge.verifiedTitle")}
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                  {submission.badgeVerifiedAt
                                    ? t("badge.verifiedDescriptionWithDate", {
                                        date: formatDate(
                                          submission.badgeVerifiedAt,
                                        ),
                                      })
                                    : t("badge.verifiedDescription")}
                                </p>
                              </div>
                            </div>
                          ) : canVerifyBadge ? (
                            <div className="flex gap-2">
                              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              <div>
                                <p className="font-medium">
                                  {submission.hasBadge
                                    ? t("badge.awaitingTitle")
                                    : t("badge.notAddedTitle")}
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                  {submission.hasBadge
                                    ? t("badge.awaitingDescription")
                                    : t("badge.notAddedDescription")}
                                </p>
                                <Link
                                  className="mt-2 inline-flex items-center text-sm font-medium text-primary hover:underline"
                                  href={`/submit/${submission.id}`}
                                >
                                  {t("verifyBadge")}
                                  <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                {t("badge.unavailable")}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {center.totalPages > 1 ? (
            <nav
              className="mt-6 flex items-center justify-between gap-3"
              aria-label={t("pagination.label")}
            >
              {center.page > 1 ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={statusCenterHref(status, center.page - 1)}>
                    <ChevronLeft className="mr-1.5 h-4 w-4" />
                    {t("pagination.previous")}
                  </Link>
                </Button>
              ) : (
                <span />
              )}
              <p className="text-sm text-muted-foreground">
                {t("pagination.page", {
                  page: center.page,
                  total: center.totalPages,
                })}
              </p>
              {center.page < center.totalPages ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={statusCenterHref(status, center.page + 1)}>
                    {t("pagination.next")}
                    <ChevronRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </section>
      </main>
    </div>
  );
}
