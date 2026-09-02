"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Loader2, CheckCircle2, XCircle, Info, RotateCw, Bookmark, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import type { TranslationStat } from "@/lib/data";

interface TranslationManagerProps {
  bookmarkStats: TranslationStat[];
  categoryStats: TranslationStat[];
}

type LogEntry = {
  timestamp: string;
  message: string;
  status: "info" | "translating" | "success" | "error";
};

type EntityType = "bookmark" | "category";

export function TranslationManager({ bookmarkStats, categoryStats }: TranslationManagerProps) {
  const router = useRouter();
  const [entityType, setEntityType] = useState<EntityType>("bookmark");
  const [selectedLocale, setSelectedLocale] = useState<string>("");
  const [batchCount, setBatchCount] = useState<number>(10);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<{ index: number; total: number } | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const stats = entityType === "bookmark" ? bookmarkStats : categoryStats;
  const selectedStat = stats.find(s => s.locale === selectedLocale);

  const scrollToBottom = useCallback(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, []);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs(prev => [...prev, entry]);
    setTimeout(scrollToBottom, 50);
  }, [scrollToBottom]);

  const handleRun = async () => {
    if (!selectedLocale || batchCount <= 0) {
      toast.error("Please select a language and enter a valid count");
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setProgress(null);
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let receivedDone = false;

    try {
      const response = await fetch("/api/admin/translate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: selectedLocale, count: batchCount, entityType }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || "Translation request failed");
      }
      if (!response.body) throw new Error("Translation stream is unavailable");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop()!;

        for (const part of parts) {
          const eventMatch = part.match(/event: (\w+)/);
          const dataMatch = part.match(/data: ([\s\S]+)/);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);

          if (event === "log") {
            addLog({
              timestamp: new Date().toLocaleTimeString(),
              message: data.message,
              status: data.status,
            });
            if (data.index && data.total) {
              setProgress({ index: data.index, total: data.total });
            }
          } else if (event === "done") {
            receivedDone = true;
            const translated = Number(data.translated) || 0;
            const failed = Number(data.failed) || 0;
            const skipped = Number(data.skipped) || 0;
            addLog({
              timestamp: new Date().toLocaleTimeString(),
              message: `Done! Translated: ${translated}, Failed: ${failed}, Skipped: ${skipped}, Total: ${data.total}`,
              status: failed > 0 ? "error" : "success",
            });
            if (failed > 0) {
              toast.warning(
                `Translation partially completed: ${translated} translated, ${failed} failed`,
              );
            } else {
              toast.success(`Translation complete: ${translated} items translated`);
            }
            if (translated > 0) router.refresh();
          }
        }
      }
      if (!receivedDone && !abortController.signal.aborted) {
        throw new Error("Translation stream closed before completion");
      }
    } catch (err) {
      if (abortController.signal.aborted) return;
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        message: `Translation error: ${err instanceof Error ? err.message : "Unknown error"}`,
        status: "error",
      });
      toast.error(
        err instanceof Error ? err.message : "Translation stream failed",
      );
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
        if (mountedRef.current) {
          setIsRunning(false);
          setProgress(null);
        }
      }
    }
  };

  const getStatusIcon = (status: LogEntry["status"]) => {
    switch (status) {
      case "translating":
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 flex-shrink-0" />;
      case "success":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />;
      case "error":
        return <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />;
      default:
        return <Info className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Entity Type Toggle */}
      <div className="flex gap-2">
        <Button
          variant={entityType === "bookmark" ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => { setEntityType("bookmark"); setSelectedLocale(""); }}
          disabled={isRunning}
        >
          <Bookmark className="h-4 w-4" />
          Bookmarks
        </Button>
        <Button
          variant={entityType === "category" ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => { setEntityType("category"); setSelectedLocale(""); }}
          disabled={isRunning}
        >
          <FolderKanban className="h-4 w-4" />
          Categories
        </Button>
      </div>

      {/* Stats Overview */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          {entityType === "bookmark" ? "Bookmark" : "Category"} Translation Progress by Language
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {stats.map((stat) => {
            const percentage = stat.total > 0 ? Math.round((stat.translated / stat.total) * 100) : 0;
            return (
              <Card
                key={stat.locale}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedLocale === stat.locale ? "ring-2 ring-primary" : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedLocale(stat.locale)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{stat.localeFlag}</span>
                  <span className="font-medium text-sm">{stat.localeName}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{stat.translated} / {stat.total}</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  {stat.remaining > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {stat.remaining} remaining
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Run Translation Form */}
      <Card className="p-4">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="space-y-2 min-w-[200px]">
            <Label>Target Language</Label>
            <Select value={selectedLocale} onValueChange={setSelectedLocale} disabled={isRunning}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {stats.map((stat) => (
                  <SelectItem key={stat.locale} value={stat.locale}>
                    {stat.localeFlag} {stat.localeName} ({stat.remaining} remaining)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 w-[140px]">
            <Label>Batch Size</Label>
            <Input
              type="number"
              min={1}
              max={selectedStat?.remaining || 100}
              value={batchCount}
              onChange={(e) => setBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={isRunning}
            />
          </div>

          <Button
            onClick={handleRun}
            disabled={isRunning || !selectedLocale || batchCount <= 0}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Translation
              </>
            )}
          </Button>

          {!isRunning && logs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setLogs([]); setProgress(null); }}
              className="gap-1"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>

        {selectedStat && selectedStat.remaining === 0 && (
          <p className="text-sm text-green-600 mt-2">
            All {entityType === "bookmark" ? "bookmarks" : "categories"} have been translated for this language.
          </p>
        )}
      </Card>

      {/* Progress Bar (during translation) */}
      {isRunning && progress && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{progress.index} / {progress.total}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.round((progress.index / progress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Log Viewer */}
      {logs.length > 0 && (
        <div
          ref={logContainerRef}
          className="bg-zinc-950 text-zinc-300 rounded-lg p-4 font-mono text-xs max-h-[500px] overflow-y-auto space-y-1"
        >
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-zinc-500 flex-shrink-0">{log.timestamp}</span>
              {getStatusIcon(log.status)}
              <span className={
                log.status === "error" ? "text-red-400" :
                log.status === "success" ? "text-green-400" :
                log.status === "translating" ? "text-blue-400" :
                "text-zinc-400"
              }>
                {log.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
