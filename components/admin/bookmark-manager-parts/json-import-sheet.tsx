"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileJson } from "lucide-react";
import type { Category } from "./types";

interface JsonImportSheetProps {
  isJsonImportSheetOpen: boolean;
  setIsJsonImportSheetOpen: (open: boolean) => void;
  handleJsonImport: (e: React.FormEvent<HTMLFormElement>) => void;
  jsonImportCategory: string;
  setJsonImportCategory: (value: string) => void;
  isImporting: boolean;
  categories: Category[];
}

export function JsonImportSheet({
  isJsonImportSheetOpen,
  setIsJsonImportSheetOpen,
  handleJsonImport,
  jsonImportCategory,
  setJsonImportCategory,
  isImporting,
  categories,
}: JsonImportSheetProps) {
  return (
      <Sheet open={isJsonImportSheetOpen} onOpenChange={setIsJsonImportSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Import Bookmarks from JSON</SheetTitle>
            <SheetDescription>
              Paste your JSON array of bookmarks below. All bookmarks will be imported to the selected category.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleJsonImport} className="mt-6 space-y-6">
            <div className="space-y-4">
              {/* Category Selection */}
              <div className="space-y-2">
                <Label htmlFor="importCategory">Target Category *</Label>
                <Select
                  value={jsonImportCategory}
                  onValueChange={setJsonImportCategory}
                  disabled={isImporting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a category...</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  All bookmarks in the JSON will be imported to this category.
                </p>
              </div>

              {/* JSON Data Input */}
              <div className="space-y-2">
                <Label htmlFor="jsonData">JSON Data *</Label>
                <Textarea
                  id="jsonData"
                  name="jsonData"
                  placeholder='[
  {
    "url": "https://example.com",
    "title": "Example Site",
    "tagline": "Short intro for list view",
    "description": "Full description for detail page",
    "whyStartups": "Why startups need this...",
    "alternatives": "Tool1, Tool2, Tool3",

    "logo_url": "https://example.com/logo.png",
    "cover_url": "https://example.com/cover.png"
  }
]'
                  rows={20}
                  className="font-mono text-xs"
                  required
                  disabled={isImporting}
                />
                <p className="text-sm text-muted-foreground">
                  Paste your JSON array here. Each object should have at least <code>url</code> and <code>title</code> fields.
                </p>
              </div>

              {/* Field Mapping Info */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <h4 className="font-semibold text-sm">Field Mapping:</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• <code>url</code> → URL (required)</li>
                  <li>• <code>title</code> → Title (required)</li>
                  <li>• <code>tagline</code> → Tagline (list view description)</li>
                  <li>• <code>description</code> → Description (detail page content)</li>
                  <li>• <code>whyStartups</code> or <code>why_startups</code> → Why Startups (optional)</li>
                  <li>• <code>alternatives</code> → Alternatives (optional)</li>

                  <li>• <code>logo_url</code> → Logo</li>
                  <li>• <code>cover_url</code> → Cover</li>
                  <li className="text-amber-600 mt-2">⚠️ Other fields (logo_path, cover_path, category, detail_url, etc.) will be ignored</li>
                </ul>
              </div>

              {isImporting && (
                <div className="space-y-2 rounded-md bg-muted p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">
                      Importing bookmarks...
                    </span>
                  </div>
                </div>
              )}
            </div>

            <SheetFooter>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsJsonImportSheetOpen(false);
                    setJsonImportCategory("none");
                  }}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isImporting || jsonImportCategory === "none"}>
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <FileJson className="mr-2 h-4 w-4" />
                      Import Bookmarks
                    </>
                  )}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
  );
}
