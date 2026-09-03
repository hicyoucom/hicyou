"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AutoCollectionRunSummary } from "@/lib/auto-collections";

type AutoCollectionPanelProps = {
  latestRun: AutoCollectionRunSummary | null;
  sourceLimit: number;
};

type Notice = { tone: "success" | "muted" | "error"; message: string } | null;

function formatRunDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function runLabel(run: AutoCollectionRunSummary): string {
  if (run.status === "succeeded") return "Completed";
  if (run.status === "failed") return "Failed";
  return "Running";
}

function getOutcomeNotice(payload: unknown): Notice {
  if (!payload || typeof payload !== "object") {
    return {
      tone: "error",
      message: "Generation did not return a usable response.",
    };
  }

  const response = payload as {
    outcome?: unknown;
    created?: unknown;
    sourceBookmarkCount?: unknown;
  };
  const outcome = response.outcome;

  if (outcome === "completed") {
    const created = Array.isArray(response.created)
      ? response.created.length
      : 0;
    return {
      tone: "success",
      message:
        created > 0
          ? `Created ${created} review draft${created === 1 ? "" : "s"}. Publish only after editorial review.`
          : "The run completed, but no new non-duplicate drafts met the quality rules.",
    };
  }
  if (outcome === "unchanged") {
    return {
      tone: "muted",
      message:
        "The public directory has not changed since the last successful run.",
    };
  }
  if (outcome === "in_progress") {
    return {
      tone: "muted",
      message:
        "A generation run for this directory snapshot is already in progress.",
    };
  }
  if (outcome === "insufficient_source") {
    const count =
      typeof response.sourceBookmarkCount === "number"
        ? response.sourceBookmarkCount
        : 0;
    return {
      tone: "muted",
      message: `At least 3 public listings are required; ${count} are available right now.`,
    };
  }
  if (outcome === "not_configured") {
    return {
      tone: "error",
      message: "Configure an AI provider key before generating topic drafts.",
    };
  }
  return {
    tone: "error",
    message: "Generation failed. Check the application logs and try again.",
  };
}

export function AutoCollectionPanel({
  latestRun,
  sourceLimit,
}: AutoCollectionPanelProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const generate = async () => {
    setIsGenerating(true);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/generate-collections", {
        method: "POST",
      });
      const payload: unknown = await response.json().catch(() => null);
      const nextNotice = getOutcomeNotice(payload);
      setNotice(nextNotice);
      if (
        response.ok ||
        (payload as { outcome?: unknown } | null)?.outcome === "in_progress"
      ) {
        router.refresh();
      }
    } catch {
      setNotice({
        tone: "error",
        message: "Could not start topic generation. Try again shortly.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.07] via-card to-card p-5">
      <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <h3 className="font-semibold">Automated topic drafts</h3>
            <Badge
              variant="outline"
              className="border-primary/25 bg-background/70 text-primary"
            >
              Review required
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Cluster up to {sourceLimit} current public listings into bounded,
            non-duplicate collection drafts. AI output is validated before
            saving and is never published automatically.
          </p>
          {latestRun ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                Last run {formatRunDate(latestRun.startedAt)} UTC
              </span>
              <Badge
                variant={
                  latestRun.status === "failed" ? "destructive" : "secondary"
                }
              >
                {runLabel(latestRun)}
              </Badge>
              {latestRun.status === "succeeded" ? (
                <span>
                  {latestRun.createdCount} draft
                  {latestRun.createdCount === 1 ? "" : "s"} from{" "}
                  {latestRun.sourceBookmarkCount} listings
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No generation run has been recorded yet.
            </p>
          )}
        </div>

        <Button onClick={generate} disabled={isGenerating} className="shrink-0">
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {isGenerating ? "Generating drafts…" : "Generate review drafts"}
        </Button>
      </div>

      {notice ? (
        <div
          aria-live="polite"
          className={`relative mt-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
            notice.tone === "success"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
              : notice.tone === "error"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-border bg-background/60 text-muted-foreground"
          }`}
        >
          {notice.tone === "success" ? (
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
          ) : null}
          <p>{notice.message}</p>
        </div>
      ) : null}
    </Card>
  );
}
