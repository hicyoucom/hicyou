"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { ImageUpload } from "@/components/admin/image-upload";
import type { BookmarkFormData, BookmarkWithCategory, Category } from "./types";
import { CategorySelector } from "@/components/category-selector";

interface EditBookmarkSheetProps {
  isSheetOpen: boolean;
  setIsSheetOpen: (open: boolean) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isNewBookmark: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  selectedBookmark: BookmarkWithCategory | null;
  formData: BookmarkFormData;
  setFormData: React.Dispatch<React.SetStateAction<BookmarkFormData>>;
  handleUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleGenerateContent: (form: HTMLFormElement) => void;
  categories: Category[];
}

export function EditBookmarkSheet({
  isSheetOpen,
  setIsSheetOpen,
  handleSubmit,
  isNewBookmark,
  isSaving,
  isGenerating,
  selectedBookmark,
  formData,
  setFormData,
  handleUrlChange,
  handleTitleChange,
  handleGenerateContent,
  categories,
}: EditBookmarkSheetProps) {
  return (
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



                  <CategorySelector
                    categories={categories
                      .filter((category) => category.status !== "archived")
                      .map((category) => ({
                      id: category.id.toString(),
                      name:
                        category.status === "draft"
                          ? `${category.name} · Draft`
                          : category.name,
                      groupKey: category.groupKey,
                      disabledAsPrimary: category.status === "draft",
                      }))}
                    value={formData.categoryIds}
                    onChange={(categoryIds) =>
                      setFormData((prev) => ({
                        ...prev,
                        categoryId: categoryIds[0] ?? "none",
                        categoryIds,
                      }))
                    }
                    primaryLabel="Primary category"
                    primaryPlaceholder="Select a primary category"
                    additionalLabel="Additional categories"
                    helperText="Choose up to two additional discovery categories."
                    allowEmpty
                  />

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
  );
}
