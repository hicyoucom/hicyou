"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SubmissionMetadata } from "@/lib/submission-prefill";

type UrlFirstStepProps = {
  checkedUrl: string | null;
  onMetadataReady: (metadata: SubmissionMetadata) => void;
  onUrlChange: (url: string) => void;
  url: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSubmissionMetadata(value: unknown): value is SubmissionMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.url === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.favicon === "string" &&
    typeof value.ogImage === "string" &&
    (value.metadataSource === "fetched" || value.metadataSource === "manual")
  );
}

function getErrorMessage(value: unknown): string | null {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : null;
}

export function UrlFirstStep({
  checkedUrl,
  onMetadataReady,
  onUrlChange,
  url,
}: UrlFirstStepProps) {
  const t = useTranslations("submit");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requiresManualEntry, setRequiresManualEntry] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const isReady = checkedUrl !== null && checkedUrl === url;
  const needsRecheck = checkedUrl !== null && !isReady;

  useEffect(() => {
    return () => {
      activeRequest.current?.abort();
    };
  }, []);

  const handleUrlInputChange = (nextUrl: string) => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setError(null);
    setIsLoading(false);
    setRequiresManualEntry(false);
    onUrlChange(nextUrl);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const candidate = url.trim();
    if (!candidate) {
      setError(t("urlFirstError"));
      return;
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 30_000);
    setError(null);
    setIsLoading(true);
    setRequiresManualEntry(false);

    try {
      const response = await fetch(
        "/api/metadata?url=" + encodeURIComponent(candidate),
        {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        },
      );
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (activeRequest.current !== controller) {
        return;
      }

      if (!response.ok) {
        setRequiresManualEntry(false);
        setError(getErrorMessage(payload) ?? t("urlFirstError"));
        return;
      }

      if (!isSubmissionMetadata(payload)) {
        setRequiresManualEntry(false);
        setError(t("urlFirstError"));
        return;
      }

      setRequiresManualEntry(payload.metadataSource === "manual");
      onMetadataReady(payload);
    } catch (fetchError) {
      if (activeRequest.current !== controller) {
        return;
      }

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        if (timedOut) {
          setError(t("urlFirstError"));
        }
        return;
      }
      setRequiresManualEntry(false);
      setError(t("urlFirstError"));
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setIsLoading(false);
      }
    }
  };

  return (
    <Card className="overflow-hidden border-primary/25">
      <div className="h-1 bg-primary" aria-hidden />
      <CardHeader className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            1
          </span>
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("urlFirstTitle")}
            </CardTitle>
            <CardDescription>{t("urlFirstDescription")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form noValidate onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="submission-url">
              {t("urlLabel")} <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="submission-url"
                name="url"
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://example.com"
                value={url}
                onChange={(event) =>
                  handleUrlInputChange(event.currentTarget.value)
                }
                maxLength={2_048}
                required
              />
              <Button
                type="submit"
                className="shrink-0"
                disabled={isLoading || !url.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("urlFirstLoading")}
                  </>
                ) : (
                  t("urlFirstButton")
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("urlHelper")}</p>
          </div>
        </form>

        {error && (
          <Alert variant="destructive">
            <CircleAlert className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {needsRecheck && (
          <Alert>
            <CircleAlert className="h-4 w-4" />
            <AlertDescription>{t("urlFirstChanged")}</AlertDescription>
          </Alert>
        )}

        {isReady && (
          <Alert
            className={
              requiresManualEntry
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-emerald-500/30 bg-emerald-500/5"
            }
          >
            {requiresManualEntry ? (
              <CircleAlert className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <AlertDescription className="space-y-1">
              <p>
                {requiresManualEntry
                  ? t("urlFirstManualEntry")
                  : t("urlFirstReady")}
              </p>
              <p className="break-all font-mono text-xs text-muted-foreground">
                {t("urlFirstCanonical", { url: checkedUrl })}
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
