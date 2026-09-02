"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  RotateCw,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  CategoryEnrichmentCandidateView,
  CategoryEnrichmentRunView,
} from "@/lib/category-enrichment";

type Props = {
  candidates: CategoryEnrichmentCandidateView[];
  runs: CategoryEnrichmentRunView[];
  statusCounts: Record<string, number>;
};

function confidenceTone(confidence: number): string {
  if (confidence >= 0.9) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (confidence >= 0.7) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-border bg-muted text-muted-foreground";
}

function displayHostname(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

export function CategoryEnrichmentPanel({
  candidates,
  runs,
  statusCounts,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [highConfidenceOnly, setHighConfidenceOnly] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reviewing, setReviewing] = useState<"approve" | "reject" | null>(null);

  const visibleCandidates = useMemo(
    () =>
      highConfidenceOnly
        ? candidates.filter((candidate) => candidate.confidence >= 0.9)
        : candidates,
    [candidates, highConfidenceOnly],
  );
  const latestRun = runs[0] ?? null;
  const allVisibleSelected =
    visibleCandidates.length > 0 &&
    visibleCandidates.every((candidate) => selected.has(candidate.id));

  const toggle = (candidateId: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        visibleCandidates.forEach((candidate) => next.delete(candidate.id));
      } else {
        visibleCandidates.forEach((candidate) => next.add(candidate.id));
      }
      return next;
    });
  };

  const generate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/admin/category-enrichment/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      });
      const payload = (await response.json().catch(() => null)) as {
        outcome?: string;
        sourceBookmarkCount?: number;
        candidateCount?: number;
      } | null;
      if (!response.ok && payload?.outcome !== "in_progress") {
        throw new Error("Generation failed");
      }
      if (payload?.outcome === "in_progress") {
        toast.info("A GLM classification run is already in progress.");
      } else {
        toast.success(
          `Reviewed ${payload?.sourceBookmarkCount ?? 0} bookmarks and created ${payload?.candidateCount ?? 0} suggestions.`,
        );
      }
      router.refresh();
    } catch {
      toast.error("Could not generate category suggestions. Check the server log.");
    } finally {
      setIsGenerating(false);
    }
  };

  const review = async (decision: "approve" | "reject") => {
    if (selected.size === 0) return;
    setReviewing(decision);
    try {
      const response = await fetch("/api/admin/category-enrichment/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: Array.from(selected), decision }),
      });
      const payload = (await response.json().catch(() => null)) as {
        applied?: number;
        rejected?: number;
        failedBookmarkIds?: number[];
      } | null;
      if (!response.ok && response.status !== 207) throw new Error("Review failed");
      const changed = decision === "approve" ? payload?.applied : payload?.rejected;
      if (payload?.failedBookmarkIds?.length) {
        toast.warning(
          `${changed ?? 0} suggestions saved; ${payload.failedBookmarkIds.length} bookmarks need manual review.`,
        );
      } else {
        toast.success(
          decision === "approve"
            ? `${changed ?? 0} suggestions added as discovery categories.`
            : `${changed ?? 0} suggestions rejected.`,
        );
      }
      setSelected(new Set());
      router.refresh();
    } catch {
      toast.error("Could not save this review decision.");
    } finally {
      setReviewing(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="grid gap-6 border-b bg-[linear-gradient(120deg,hsl(var(--muted)/.65),transparent_65%)] p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-sky-500/10 text-sky-700 hover:bg-sky-500/10 dark:text-sky-300">
                GLM 5.3 Flash
              </Badge>
              <Badge variant="outline" className="rounded-full">
                Editorial approval required
              </Badge>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Historical category enrichment
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Generate evidence-backed discovery categories without changing
                existing primary categories. Model output remains isolated until
                an administrator approves it here.
              </p>
            </div>
          </div>
          <Button onClick={generate} disabled={isGenerating} className="min-w-48">
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? "Classifying 100…" : "Generate next 100"}
          </Button>
        </div>

        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {[
            ["Pending review", statusCounts.pending ?? 0],
            ["Applied", statusCounts.applied ?? 0],
            ["Rejected", statusCounts.rejected ?? 0],
            [
              "Latest run",
              latestRun
                ? `${latestRun.processedCount}/${latestRun.sourceBookmarkCount}`
                : "—",
            ],
          ].map(([label, value]) => (
            <div key={label} className="px-5 py-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={highConfidenceOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setHighConfidenceOnly((value) => !value)}
            >
              ≥90% confidence
            </Button>
            <span className="text-sm text-muted-foreground">
              {visibleCandidates.length} visible · {selected.size} selected
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => review("reject")}
              disabled={selected.size === 0 || reviewing !== null}
            >
              {reviewing === "reject" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => review("approve")}
              disabled={selected.size === 0 || reviewing !== null}
            >
              {reviewing === "approve" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Approve and apply
            </Button>
          </div>
        </div>

        {visibleCandidates.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleAllVisible}
                    aria-label="Select all visible suggestions"
                  />
                </TableHead>
                <TableHead>Bookmark</TableHead>
                <TableHead>Classification change</TableHead>
                <TableHead>Model evidence</TableHead>
                <TableHead className="w-28 text-right">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCandidates.map((candidate) => (
                <TableRow
                  key={candidate.id}
                  data-state={selected.has(candidate.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.has(candidate.id)}
                      onCheckedChange={() => toggle(candidate.id)}
                      aria-label={`Select ${candidate.bookmarkTitle}`}
                    />
                  </TableCell>
                  <TableCell className="min-w-56">
                    <div className="font-medium">{candidate.bookmarkTitle}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="max-w-44 truncate">
                        {displayHostname(candidate.bookmarkUrl)}
                      </span>
                      <Link
                        href={`/${candidate.bookmarkSlug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-72">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {candidate.currentCategories.map((category) => (
                        <Badge key={category} variant="secondary">
                          {category}
                        </Badge>
                      ))}
                      <ArrowRight className="mx-1 h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className="border-sky-500/30 text-sky-700 dark:text-sky-300">
                        {candidate.categoryName}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xl text-sm leading-5 text-muted-foreground">
                    {candidate.rationale}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={`tabular-nums ${confidenceTone(candidate.confidence)}`}
                    >
                      {Math.round(candidate.confidence * 100)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-muted">
              <RotateCw className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-medium">No suggestions in this view</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate the next review batch or show all confidence levels.
              </p>
            </div>
          </div>
        )}
      </Card>

      {runs.length > 0 ? (
        <Card className="p-4">
          <h2 className="text-sm font-medium">Recent runs</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {runs.map((run) => (
              <Badge key={run.id} variant="outline" className="gap-1.5 py-1.5">
                Run {run.id}
                <span className="text-muted-foreground">{run.status}</span>
                <span className="tabular-nums">
                  {run.candidateCount} suggestions
                </span>
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
