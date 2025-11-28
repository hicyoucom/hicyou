"use client";

import { useState, useEffect } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ImageUpload } from "@/components/admin/image-upload";
import { Pagination } from "@/components/ui/pagination";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date | null;
}

interface Bookmark {
  id: number;
  title: string;
  slug: string;
  url: string;
  description: string | null;
  overview: string | null;
  whyStartups: string | null;
  alternatives: string | null;
  pricingType: string | null;
  search_results: string | null;
  favicon: string | null;
  ogImage: string | null;
  categoryId: number | null;
  isFavorite: boolean;
  isArchived: boolean;
  isDofollow: boolean;
  createdAt: Date;
  updatedAt: Date;
  notes: string | null;
  keyFeatures: any;
  useCases: any;
  faqs: any;
}

interface BookmarkWithCategory extends Bookmark {
  category: Category | null;
}

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
        if (bookmark.categoryId !== null) return false;
      } else {
        if (bookmark.categoryId?.toString() !== selectedCategoryFilter) return false;
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
        bookmark.category?.name.toLowerCase().includes(searchLower)
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
  };

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategoryFilter]);

  useEffect(() => {
    if (bulkUploadState?.success) {
      if (
        bulkUploadState.progress?.current === bulkUploadState.progress?.total
      ) {
        toast.success(
          bulkUploadState.message || "Bookmarks uploaded successfully",
        );
        setIsUploading(false);
        setIsSheetOpen(false);
        setBulkUploadState(null);
      } else if (bulkUploadState.progress?.lastAdded) {
        toast.success(`Added: ${bulkUploadState.progress.lastAdded}`);
      }
    } else if (bulkUploadState?.error) {
      toast.error(bulkUploadState.error);
      if (
        !bulkUploadState.progress ||
        bulkUploadState.progress.current === bulkUploadState.progress.total
      ) {
        setIsUploading(false);
      }
    }
  }, [bulkUploadState]);

  // Form state management
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    url: "",
    description: "",
    overview: "",
    whyStartups: "",
    alternatives: "",
    pricingType: "Paid",
    search_results: "",
    favicon: "",
    ogImage: "",
    categoryId: "none",
    isFavorite: false,
    isArchived: false,
    isDofollow: false,
    keyFeatures: "",
    useCases: "",
    faqs: "",
  });

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
        pricingType: form.get("pricingType") as string,
        favicon: form.get("favicon") as string,
        ogImage: form.get("ogImage") as string,
        search_results: form.get("search_results") as string,
        categoryId: form.get("categoryId") as string,
        isFavorite: form.get("isFavorite") as string,
        isArchived: form.get("isArchived") as string,
        isDofollow: form.get("isDofollow") as string,
        keyFeatures: form.get("keyFeatures") as string,
        useCases: form.get("useCases") as string,
        faqs: form.get("faqs") as string,
      };

      if (!isNewBookmark) {
        (formDataObject as any).id = form.get("id") as string;
      }

      const result = isNewBookmark
        ? await createBookmark(null, formDataObject)
        : await updateBookmark(null, formDataObject as any);

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

  // Reset form when sheet opens/closes
  useEffect(() => {
    if (isSheetOpen) {
      if (selectedBookmark) {
        setFormData({
          title: selectedBookmark.title,
          slug: selectedBookmark.slug,
          url: selectedBookmark.url,
          description: selectedBookmark.description || "",
          overview: selectedBookmark.overview || "",
          whyStartups: selectedBookmark.whyStartups || "",
          alternatives: selectedBookmark.alternatives || "",
          pricingType: selectedBookmark.pricingType || "Paid",
          search_results: selectedBookmark.search_results || "",
          favicon: selectedBookmark.favicon || "",
          ogImage: selectedBookmark.ogImage || "",
          categoryId: selectedBookmark.categoryId?.toString() || "none",
          isFavorite: selectedBookmark.isFavorite,
          isArchived: selectedBookmark.isArchived,
          isDofollow: selectedBookmark.isDofollow || false,
          keyFeatures: selectedBookmark.keyFeatures ? JSON.stringify(selectedBookmark.keyFeatures, null, 2) : "",
          useCases: selectedBookmark.useCases ? JSON.stringify(selectedBookmark.useCases, null, 2) : "",
          faqs: selectedBookmark.faqs ? JSON.stringify(selectedBookmark.faqs, null, 2) : "",
        });
      } else {
        resetForm();
      }
    }
  }, [isSheetOpen, selectedBookmark]);

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      url: "",
      description: "",
      overview: "",
      whyStartups: "",
      alternatives: "",
      pricingType: "Paid",
      search_results: "",
      favicon: "",
      ogImage: "",
      categoryId: "none",
      isFavorite: false,
      isArchived: false,
      isDofollow: false,
      keyFeatures: "",
      useCases: "",
      faqs: "",
    });
  };

  const handleEdit = (bookmark: BookmarkWithCategory) => {
    setSelectedBookmark(bookmark);
    setIsNewBookmark(false);
    setIsSheetOpen(true);
  };

  const handleNew = () => {
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

  // Clear selection when filter or pagination changes
  useEffect(() => {
    setSelectedBookmarks(new Set());
  }, [searchTerm, selectedCategoryFilter, currentPage]);

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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="w-64">
          <Select
            value={selectedCategoryFilter}
            onValueChange={setSelectedCategoryFilter}
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
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[30, 50, 100]}
        />
      )}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <form id="bookmarkForm" onSubmit={handleSubmit}>
            <SheetHeader className="flex flex-row items-start justify-between space-y-0 pb-6">
              <div className="space-y-1">
                <SheetTitle>
                  {isNewBookmark ? "Add Bookmark" : "Edit Bookmark"}
                </SheetTitle>
                <SheetDescription>
                  {isNewBookmark
                    ? "Add a new bookmark to your collection"
                    : "Update the details of your bookmark"}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={isSaving}
                  size="sm"
                  className="shrink-0"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <SheetClose asChild>
                  <Button type="button" variant="outline" size="sm">
                    Cancel
                  </Button>
                </SheetClose>
              </div>
            </SheetHeader>

            <div className="space-y-6">
              <input type="hidden" name="id" value={selectedBookmark?.id || ""} />
              <input type="hidden" name="slug" value={formData.slug} />
              <input type="hidden" name="favicon" value={formData.favicon} />
              <input type="hidden" name="ogImage" value={formData.ogImage} />
              <input type="hidden" name="categoryId" value={formData.categoryId} />
              <input type="hidden" name="pricingType" value={formData.pricingType} />
              <input type="hidden" name="isFavorite" value={formData.isFavorite ? "true" : "false"} />
              <input type="hidden" name="isArchived" value={formData.isArchived ? "true" : "false"} />
              <input type="hidden" name="isDofollow" value={formData.isDofollow ? "true" : "false"} />

              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="url"
                        name="url"
                        type="url"
                        required
                        value={formData.url}
                        onChange={handleUrlChange}
                        placeholder="https://example.com"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          const form = document.getElementById(
                            "bookmarkForm",
                          ) as HTMLFormElement;
                          if (form) handleGenerateContent(form);
                        }}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          "Generate"
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      name="title"
                      required
                      value={formData.title}
                      onChange={handleTitleChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Tagline</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Short intro for list view (max 2 lines)"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be displayed in the list view and below the title on detail page
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="overview">Description</Label>
                    <Textarea
                      id="overview"
                      name="overview"
                      value={formData.overview}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          overview: e.target.value,
                        }))
                      }
                      placeholder="Detailed content for detail page (supports Markdown)"
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Detailed description shown on the detail page (Markdown supported)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whyStartups">Why do startups need this tool? (Optional)</Label>
                    <Textarea
                      id="whyStartups"
                      name="whyStartups"
                      value={formData.whyStartups}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          whyStartups: e.target.value,
                        }))
                      }
                      placeholder="Explain why this tool is valuable for startups..."
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional: A paragraph explaining the value for startups
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alternatives">Alternatives (Optional)</Label>
                    <Input
                      id="alternatives"
                      name="alternatives"
                      value={formData.alternatives}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          alternatives: e.target.value,
                        }))
                      }
                      placeholder="Tool1, Tool2, Tool3"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional: Comma-separated list of alternative tools (e.g., Notion, Trello, Asana)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Pricing Type *</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Free', 'Freemium', 'Paid'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              pricingType: type,
                            }))
                          }
                          className={`px-4 py-3 rounded-lg border-2 transition-all font-medium ${formData.pricingType === type
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                            }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <input type="hidden" name="pricingType" value={formData.pricingType} />
                    <p className="text-xs text-muted-foreground">
                      Required: Select the pricing model for this tool
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, categoryId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Category</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keyFeatures">Key Features (JSON)</Label>
                    <Textarea
                      id="keyFeatures"
                      name="keyFeatures"
                      value={formData.keyFeatures}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          keyFeatures: e.target.value,
                        }))
                      }
                      placeholder='["Feature 1", "Feature 2"]'
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="useCases">Use Cases (JSON)</Label>
                    <Textarea
                      id="useCases"
                      name="useCases"
                      value={formData.useCases}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          useCases: e.target.value,
                        }))
                      }
                      placeholder='["Use Case 1", "Use Case 2"]'
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="faqs">FAQs (JSON)</Label>
                    <Textarea
                      id="faqs"
                      name="faqs"
                      value={formData.faqs}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          faqs: e.target.value,
                        }))
                      }
                      placeholder='[{"question": "Q1", "answer": "A1"}]'
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>

                  <ImageUpload
                    type="logo"
                    label="Logo Image URL"
                    value={formData.favicon}
                    onChange={(url) =>
                      setFormData((prev) => ({
                        ...prev,
                        favicon: url,
                      }))
                    }
                    placeholder="https://example.com/logo.png"
                    description="Small logo displayed in cards and detail page header"
                  />

                  <ImageUpload
                    type="cover"
                    label="Cover Image URL"
                    value={formData.ogImage}
                    onChange={(url) =>
                      setFormData((prev) => ({
                        ...prev,
                        ogImage: url,
                      }))
                    }
                    placeholder="https://example.com/cover.jpg"
                    description="Large preview image shown on detail page and social sharing"
                  />

                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isFavorite"
                        checked={formData.isFavorite}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            isFavorite: checked as boolean,
                          }))
                        }
                      />
                      <Label htmlFor="isFavorite">Favorite</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isArchived"
                        checked={formData.isArchived}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            isArchived: checked as boolean,
                          }))
                        }
                      />
                      <Label htmlFor="isArchived">Archived</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isDofollow"
                        checked={formData.isDofollow}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            isDofollow: checked as boolean,
                          }))
                        }
                      />
                      <Label htmlFor="isDofollow" className="font-semibold text-green-600">Dofollow</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </SheetContent>
      </Sheet>

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

      {/* JSON Import Sheet */}
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
    "pricingType": "Freemium",
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
                  <li>• <code>pricingType</code> or <code>pricing_type</code> → Pricing (optional, default: Paid)</li>
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
    </div>
  );
}
