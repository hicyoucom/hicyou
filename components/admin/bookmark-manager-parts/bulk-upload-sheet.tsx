"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/actions";

interface BulkUploadSheetProps {
  isBulkSheetOpen: boolean;
  setIsBulkSheetOpen: (open: boolean) => void;
  handleBulkUpload: (e: React.FormEvent<HTMLFormElement>) => void;
  isUploading: boolean;
  bulkUploadState: ActionState | null;
}

export function BulkUploadSheet({
  isBulkSheetOpen,
  setIsBulkSheetOpen,
  handleBulkUpload,
  isUploading,
  bulkUploadState,
}: BulkUploadSheetProps) {
  return (
      <Sheet open={isBulkSheetOpen} onOpenChange={setIsBulkSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Bulk Upload Bookmarks</SheetTitle>
            <SheetDescription>
              Upload a CSV file with a list of URLs to import. Each URL will be
              processed with a short delay to avoid rate limits.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleBulkUpload} className="mt-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Upload CSV File</Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  accept=".csv,text/csv"
                  required
                  disabled={isUploading}
                />
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file with a list of URLs (one per line). The
                  first row can optionally contain a header.
                </p>
              </div>

              {isUploading && (
                <div className="space-y-2 rounded-md bg-muted p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">
                      Processing URLs...
                    </span>
                  </div>
                  {bulkUploadState?.progress && (
                    <div className="text-sm text-muted-foreground">
                      Processing {bulkUploadState.progress.current} of{" "}
                      {bulkUploadState.progress.total} URLs
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    This may take a while. Please keep this window open.
                  </p>
                </div>
              )}
            </div>

            <SheetFooter>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                <SheetClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                </SheetClose>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload and Process"
                  )}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
  );
}
