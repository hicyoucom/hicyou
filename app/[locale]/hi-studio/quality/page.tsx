import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Container, Section } from "@/components/craft";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin-auth";
import {
  BOOKMARK_QUALITY_LABELS,
  BOOKMARK_QUALITY_RULES,
} from "@/lib/bookmark-quality";
import { getBookmarkQualityReport } from "@/lib/data/bookmark-quality";
import { parseHttpUrl } from "@/lib/url-validator";

export const dynamic = "force-dynamic";

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

function formatDate(value: Date | null): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(value);
}

// Older records may predate the current write-side URL validation. Rendering
// an untrusted `javascript:` or malformed value as a clickable admin link
// would create a stored-XSS footgun, so validate without performing network I/O.
function getSafeExternalHref(value: string): string | null {
  try {
    return parseHttpUrl(value).toString();
  } catch {
    return null;
  }
}

export default async function BookmarkQualityPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/");

  const report = await getBookmarkQualityReport();

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
                <h1 className="text-3xl font-bold tracking-tight">
                  Data Quality
                </h1>
                <p className="mt-1 max-w-3xl text-muted-foreground">
                  Review editorial completeness for live directory listings and
                  send each item through the existing bookmark editor.
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/hi-studio/manage">Open bookmark manager</Link>
            </Button>
          </div>

          <Card className="border-sky-500/20 bg-sky-500/5">
            <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
              <p>
                This is a read-only content-completeness report. It never
                fetches publisher URLs, changes a listing&apos;s lifecycle, or
                treats a missing field as evidence of a broken product.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active listings</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {formatNumber(report.activeListings)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Published, non-archived, non-deleted
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Baseline complete</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {formatPercent(report.completeRate)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {formatNumber(report.completeListings)} listings meet every
                check
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Field coverage</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {formatPercent(report.fieldCoverageRate)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Present fields across the editorial baseline
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Review queue</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {formatNumber(report.needsReview)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Listings with one or more missing fields
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Coverage by field</CardTitle>
              <CardDescription>
                Each check uses the same baseline as the review queue below.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {report.issueCounts.map(({ issue, count }) => {
                const affectedRate =
                  report.activeListings > 0 ? count / report.activeListings : 0;
                return (
                  <div key={issue} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">
                        {BOOKMARK_QUALITY_LABELS[issue]}
                      </p>
                      <Badge variant={count === 0 ? "secondary" : "outline"}>
                        {formatNumber(count)}
                      </Badge>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        aria-hidden="true"
                        className="h-full rounded-full bg-amber-500"
                        style={{
                          width: `${Math.min(100, affectedRate * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatPercent(affectedRate)} need this field
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {report.reviewQueue.length > 0 ? (
                  <CircleAlert className="h-5 w-5 text-amber-500" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                )}
                Review queue
              </CardTitle>
              <CardDescription>
                {report.reviewQueue.length > 0
                  ? `Showing the ${report.reviewQueue.length} listings with the largest number of missing fields.`
                  : "Every active listing meets the current editorial baseline."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.reviewQueue.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No content-completeness issues are currently queued.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Listing</TableHead>
                      <TableHead>Missing fields</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead>Last edited</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.reviewQueue.map((item) => {
                      const externalHref = getSafeExternalHref(item.url);

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="min-w-52">
                            <p className="font-medium">{item.title}</p>
                            {externalHref ? (
                              <a
                                className="mt-1 block max-w-72 truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                                href={externalHref}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                {item.url}
                              </a>
                            ) : (
                              <p className="mt-1 text-xs text-destructive">
                                Invalid stored URL
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex min-w-64 flex-wrap gap-1.5">
                              {item.issues.map((issue) => (
                                <Badge key={issue} variant="secondary">
                                  {BOOKMARK_QUALITY_LABELS[issue]}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {item.score}%
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDate(item.updatedAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button asChild size="sm" variant="ghost">
                                <Link href={`/${item.slug}`}>View</Link>
                              </Button>
                              <Button asChild size="sm" variant="outline">
                                <Link
                                  href={`/hi-studio/manage?q=${encodeURIComponent(item.title)}`}
                                >
                                  Review
                                </Link>
                              </Button>
                              {externalHref && (
                                <a
                                  aria-label={`Open ${item.title} on its publisher site`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                  href={externalHref}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  <ExternalLink
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5"
                                  />
                                </a>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current editorial baseline</CardTitle>
              <CardDescription>
                A listing is complete only when all fields below are present.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-wrap gap-2" aria-label="Quality checks">
                {BOOKMARK_QUALITY_RULES.map((rule) => (
                  <li key={rule.key}>
                    <Badge variant="outline">{rule.label}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </Container>
    </Section>
  );
}
