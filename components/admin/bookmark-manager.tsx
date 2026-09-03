"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createBookmark,
  updateBookmark,
  deleteBookmark,
  generateContent,
  bulkUploadBookmarks,
  importBookmarksFromJSON,
  type ActionState,
} from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Upload, Loader2, Trash2, FileJson } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { EditBookmarkSheet } from "./bookmark-manager-parts/edit-sheet";
import { BulkUploadSheet } from "./bookmark-manager-parts/bulk-upload-sheet";
import { JsonImportSheet } from "./bookmark-manager-parts/json-import-sheet";
import type { Category, BookmarkWithCategory, BookmarkFormData } from "./bookmark-manager-parts/types";

interface BookmarkManagerProps {
  categories: Category[];
  bookmarks: BookmarkWithCategory[];
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function BookmarkManager({
  bookmarks,
  categories,
}: BookmarkManagerProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isBulkSheetOpen, setIsBulkSheetOpen] = useState(false);
  const [isJsonImportSheetOpen, setIsJsonImportSheetOpen] = useState(false);

  const [bulkUploadState, setBulkUploadState] = useState<ActionState | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [jsonImportCategory, setJsonImportCategory] = useState<string>("none");

  const [bookmarkToDelete, setBookmarkToDelete] =
    useState<BookmarkWithCategory | null>(null);
  const [isSingleDeleting, setIsSingleDeleting] = useState(false);

  const [selectedBookmark, setSelectedBookmark] =
    useState<BookmarkWithCategory | null>(null);
  const [isNewBookmark, setIsNewBookmark] = useState(true);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  // Multi-select state
  const [selectedBookmarks, setSelectedBookmarks] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  // Filter bookmarks
  const filteredBookmarks = bookmarks.filter((bookmark) => {
    // Category filter
    if (selectedCategoryFilter !== "all") {
      if (selectedCategoryFilter === "none") {
        if (bookmark.categories.length > 0) return false;
      } else {
        if (
          !bookmark.categories.some(
            (category) => category.id.toString() === selectedCategoryFilter,
          )
        ) return false;
      }
    }

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return (
        bookmark.title.toLowerCase().includes(searchLower) ||
        bookmark.url.toLowerCase().includes(searchLower) ||
        bookmark.description?.toLowerCase().includes(searchLower) ||
        bookmark.overview?.toLowerCase().includes(searchLower) ||
        bookmark.categories.some((category) =>
          category.name.toLowerCase().includes(searchLower),
        )
      );
    }

    return true;
  });

  // Calculate pagination data
  const totalPages = Math.ceil(filteredBookmarks.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedBookmarks = filteredBookmarks.slice(startIndex, endIndex);

  // Reset to first page when page size changes
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    setSelectedBookmarks(new Set());
  };

  // Form state management
  const [formData, setFormData] = useState<BookmarkFormData>({
    title: "",
    slug: "",
    url: "",
    description: "",
    overview: "",
    whyStartups: "",
    alternatives: "",

    search_results: "",
    favicon: "",
    ogImage: "",
    categoryId: "none",
    categoryIds: [],
    isFavorite: false,
    isArchived: false,
    isDofollow: false,
    keyFeatures: "",
    useCases: "",
    faqs: "",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      url: "",
      description: "",
      overview: "",
      whyStartups: "",
      alternatives: "",
      search_results: "",
      favicon: "",
      ogImage: "",
      categoryId: "none",
      categoryIds: [],
      isFavorite: false,
      isArchived: false,
      isDofollow: false,
      keyFeatures: "",
      useCases: "",
      faqs: "",
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const form = new FormData(e.currentTarget);
      const formDataObject = {
        title: form.get("title") as string,
        description: form.get("description") as string,
        url: form.get("url") as string,
        slug: form.get("slug") as string,
        overview: form.get("overview") as string,
        whyStartups: form.get("whyStartups") as string,
        alternatives: form.get("alternatives") as string,

        favicon: form.get("favicon") as string,
        ogImage: form.get("ogImage") as string,
        search_results: form.get("search_results") as string,
        categoryId: form.get("categoryId") as string,
        categoryIds: formData.categoryIds,
        isFavorite: form.get("isFavorite") as string,
        isArchived: form.get("isArchived") as string,
        isDofollow: form.get("isDofollow") as string,
        keyFeatures: form.get("keyFeatures") as string,
        useCases: form.get("useCases") as string,
        faqs: form.get("faqs") as string,
      };

      const result = isNewBookmark
        ? await createBookmark(null, formDataObject)
        : await updateBookmark(null, {
            ...formDataObject,
            id: String(form.get("id") ?? ""),
          });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          isNewBookmark ? "Bookmark created!" : "Bookmark updated!",
        );
        setIsSheetOpen(false);
        resetForm();
        // Refresh server component data
        router.refresh();
      }
    } catch (err) {
      console.error("Error saving bookmark:", err);
      toast.error("Failed to save bookmark");
    } finally {
      setIsSaving(false);
    }
  };

  const populateForm = (bookmark: BookmarkWithCategory) => {
    setFormData({
      title: bookmark.title,
      slug: bookmark.slug,
      url: bookmark.url,
      description: bookmark.description || "",
      overview: bookmark.overview || "",
      whyStartups: bookmark.whyStartups || "",
      alternatives: bookmark.alternatives || "",
      search_results: bookmark.search_results || "",
      favicon: bookmark.favicon || "",
      ogImage: bookmark.ogImage || "",
      categoryId: bookmark.categoryId?.toString() || "none",
      categoryIds:
        bookmark.categories.length > 0
          ? bookmark.categories.map((category) => category.id.toString())
          : bookmark.categoryId
            ? [bookmark.categoryId.toString()]
            : [],
      isFavorite: bookmark.isFavorite,
      isArchived: bookmark.isArchived,
      isDofollow: bookmark.isDofollow || false,
      keyFeatures: bookmark.keyFeatures
        ? JSON.stringify(bookmark.keyFeatures, null, 2)
        : "",
      useCases: bookmark.useCases
        ? JSON.stringify(bookmark.useCases, null, 2)
        : "",
      faqs: bookmark.faqs ? JSON.stringify(bookmark.faqs, null, 2) : "",
    });
  };

  const handleEdit = (bookmark: BookmarkWithCategory) => {
    populateForm(bookmark);
    setSelectedBookmark(bookmark);
    setIsNewBookmark(false);
    setIsSheetOpen(true);
  };

  const handleNew = () => {
    resetForm();
    setSelectedBookmark(null);
    setIsNewBookmark(true);
    setIsSheetOpen(true);
  };

  const handleDelete = async (bookmark: BookmarkWithCategory) => {
    setIsSingleDeleting(true);
    setBookmarkToDelete(bookmark);

    try {
      const deleteData = {
        id: bookmark.id.toString(),
        url: bookmark.url,
      };
      const result = await deleteBookmark(null, deleteData);

      if (result.success) {
        toast.success("Bookmark deleted!");
        setBookmarkToDelete(null);
        // Refresh server component data
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete bookmark");
      }
    } catch (err) {
      console.error("Error deleting bookmark:", err);
      toast.error("Failed to delete bookmark");
    } finally {
      setIsSingleDeleting(false);
    }
  };

  // Handle individual bookmark selection
  const handleSelectBookmark = (bookmarkId: number) => {
    const newSelected = new Set(selectedBookmarks);
    if (newSelected.has(bookmarkId)) {
      newSelected.delete(bookmarkId);
    } else {
      newSelected.add(bookmarkId);
    }
    setSelectedBookmarks(newSelected);
  };

  // Handle select all / deselect all
  const handleSelectAll = () => {
    if (selectedBookmarks.size === paginatedBookmarks.length) {
      // If all selected, deselect all
      setSelectedBookmarks(new Set());
    } else {
      // Select all on current page
      const allIds = new Set(paginatedBookmarks.map(b => b.id));
      setSelectedBookmarks(allIds);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedBookmarks.size === 0) {
      toast.error("Please select bookmarks to delete");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedBookmarks.size} bookmark(s)?`)) {
      return;
    }

    setIsDeleting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const bookmarkId of Array.from(selectedBookmarks)) {
        const bookmark = bookmarks.find(b => b.id === bookmarkId);
        if (bookmark) {
          try {
            const result = await deleteBookmark(null, {
              id: bookmarkId.toString(),
              url: bookmark.url,
            });
            if (result.success) {
              successCount++;
            } else {
              failCount++;
            }
          } catch (err) {
            failCount++;
            console.error(`Error deleting bookmark ${bookmarkId}:`, err);
          }
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} bookmark(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} bookmark(s)`);
      }

      // Clear selection
      setSelectedBookmarks(new Set());
      // Refresh data
      router.refresh();
    } catch (err) {
      console.error("Error in bulk delete:", err);
      toast.error("Failed to delete bookmarks");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = generateSlug(title);
    setFormData((prev) => ({ ...prev, title, slug }));
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let url = e.target.value.trim();
    if (url && !url.match(/^https?:\/\//)) {
      url = `https://${url}`;
    }
    setFormData((prev) => ({ ...prev, url }));
  };

  const handleGenerateContent = async (form: HTMLFormElement) => {
    if (isGenerating) return;

    try {
      setIsGenerating(true);
      const formData = new FormData(form);
      const url = formData.get("url") as string;

      if (!url) {
        toast.error("Please enter a URL first");
        return;
      }

      // Create a new FormData with just the URL
      const data = new FormData();
      data.append("url", url);

      const result = await generateContent(url);

      if ("error" in result) {
        toast.error(result.error as string);
      } else {
        setFormData((prev) => ({
          ...prev,
          title: result.title || prev.title,
          description: result.description || prev.description,
          overview: result.overview || prev.overview,
          favicon: result.favicon || prev.favicon,
          ogImage: result.ogImage || prev.ogImage,
          slug: result.slug || prev.slug,
          keyFeatures: result.keyFeatures ? JSON.stringify(result.keyFeatures, null, 2) : prev.keyFeatures,
          useCases: result.useCases ? JSON.stringify(result.useCases, null, 2) : prev.useCases,
          faqs: result.faqs ? JSON.stringify(result.faqs, null, 2) : prev.faqs,
        }));
        toast.success("Content generated successfully!");
      }
    } catch (err) {
      console.error("Error generating content:", err);
      toast.error("Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;

    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsUploading(true);
    try {
      const text = await file.text();
      const urls = text
        .split("\n")
        .map((url) => url.trim())
        .filter((url) => url && !url.toLowerCase().startsWith("url")); // Skip header if present

      const result = await bulkUploadBookmarks(null, { urls: urls.join("\n") });

      if (result.success) {
        toast.success(result.message || "Bookmarks uploaded successfully");
        setIsBulkSheetOpen(false);
        // Refresh server component data
        router.refresh();
      } else {
        toast.error(result.error || "Failed to upload bookmarks");
      }

      setBulkUploadState(result);
    } catch (error) {
      toast.error("Failed to process the CSV file");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleJsonImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (jsonImportCategory === "none") {
      toast.error("Please select a category");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const jsonData = formData.get("jsonData") as string;

    if (!jsonData || jsonData.trim() === "") {
      toast.error("Please paste JSON data");
      return;
    }

    setIsImporting(true);

    try {
      const result = await importBookmarksFromJSON(null, {
        jsonData: jsonData.trim(),
        categoryId: jsonImportCategory,
      });

      if (result.success) {
        toast.success(result.message || "Bookmarks imported successfully");
        setIsJsonImportSheetOpen(false);
        setJsonImportCategory("none");
        // Refresh server component data
        router.refresh();
        // Reset form
        e.currentTarget.reset();
      } else {
        toast.error(result.error || "Failed to import bookmarks");
      }
    } catch (error) {
      toast.error("Failed to import bookmarks");
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Manage Bookmarks</h2>
          {selectedBookmarks.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedBookmarks.size} selected
              </span>
              <Button
                onClick={handleBulkDelete}
                size="sm"
                variant="destructive"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsBulkSheetOpen(true)}
            size="sm"
            variant="outline"
          >
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button
            onClick={() => setIsJsonImportSheetOpen(true)}
            size="sm"
            variant="outline"
          >
            <FileJson className="mr-2 h-4 w-4" />
            Import JSON
          </Button>
          <Button onClick={handleNew} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Bookmark
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by title, URL, description..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
              setSelectedBookmarks(new Set());
            }}
            className="max-w-md"
          />
        </div>
        <div className="w-64">
          <Select
            value={selectedCategoryFilter}
            onValueChange={(value) => {
              setSelectedCategoryFilter(value);
              setCurrentPage(1);
              setSelectedBookmarks(new Set());
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="none">Uncategorized</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(searchTerm || selectedCategoryFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategoryFilter("all");
              setCurrentPage(1);
              setSelectedBookmarks(new Set());
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Filter Results Summary */}
      {(searchTerm || selectedCategoryFilter !== "all") && (
        <div className="text-sm text-muted-foreground">
          Found {filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? "s" : ""}
          {searchTerm && ` matching "${searchTerm}"`}
          {selectedCategoryFilter !== "all" && (
            <>
              {" "}in category "
              {selectedCategoryFilter === "none"
                ? "Uncategorized"
                : categories.find((c) => c.id.toString() === selectedCategoryFilter)?.name}
              "
            </>
          )}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={paginatedBookmarks.length > 0 && selectedBookmarks.size === paginatedBookmarks.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedBookmarks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No bookmarks found
                </TableCell>
              </TableRow>
            ) : (
              paginatedBookmarks.map((bookmark) => (
                <TableRow key={bookmark.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedBookmarks.has(bookmark.id)}
                      onCheckedChange={() => handleSelectBookmark(bookmark.id)}
                      aria-label={`Select ${bookmark.title}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{bookmark.title}</TableCell>
                  <TableCell>
                    {bookmark.category && (
                      <Badge
                        style={{
                          backgroundColor: bookmark.category.color || undefined,
                          color: "white",
                        }}
                      >
                        {bookmark.category.name}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {bookmark.isFavorite && (
                        <Badge variant="secondary">Favorite</Badge>
                      )}
                      {bookmark.isArchived && (
                        <Badge variant="secondary">Archived</Badge>
                      )}
                      {bookmark.isDofollow && (
                        <Badge className="bg-green-500 text-white hover:bg-green-600">Dofollow</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(bookmark)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(bookmark)}
                        disabled={
                          isSingleDeleting && bookmarkToDelete?.id === bookmark.id
                        }
                      >
                        {isSingleDeleting && bookmarkToDelete?.id === bookmark.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filteredBookmarks.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredBookmarks.length}
          onPageChange={(page) => {
            setCurrentPage(page);
            setSelectedBookmarks(new Set());
          }}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[30, 50, 100]}
        />
      )}

      <EditBookmarkSheet
        isSheetOpen={isSheetOpen}
        setIsSheetOpen={setIsSheetOpen}
        handleSubmit={handleSubmit}
        isNewBookmark={isNewBookmark}
        isSaving={isSaving}
        isGenerating={isGenerating}
        selectedBookmark={selectedBookmark}
        formData={formData}
        setFormData={setFormData}
        handleUrlChange={handleUrlChange}
        handleTitleChange={handleTitleChange}
        handleGenerateContent={handleGenerateContent}
        categories={categories}
      />

      <BulkUploadSheet
        isBulkSheetOpen={isBulkSheetOpen}
        setIsBulkSheetOpen={setIsBulkSheetOpen}
        handleBulkUpload={handleBulkUpload}
        isUploading={isUploading}
        bulkUploadState={bulkUploadState}
      />

      <JsonImportSheet
        isJsonImportSheetOpen={isJsonImportSheetOpen}
        setIsJsonImportSheetOpen={setIsJsonImportSheetOpen}
        handleJsonImport={handleJsonImport}
        jsonImportCategory={jsonImportCategory}
        setJsonImportCategory={setJsonImportCategory}
        isImporting={isImporting}
        categories={categories}
      />
    </div>
  );
}
