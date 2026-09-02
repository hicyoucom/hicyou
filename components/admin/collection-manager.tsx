"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import {
  createCollection,
  updateCollection,
  deleteCollection,
  getCollectionBookmarkIdsAction,
  ActionState,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Plus, ExternalLink, Library } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface BookmarkItem {
  id: number;
  title: string;
  slug: string;
  favicon: string | null;
  category: { name: string } | null;
}

interface CollectionItem {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  coverImage: string | null;
  status: string;
  sortOrder: number;
  generationRunId: number | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CollectionManagerProps {
  collections: CollectionItem[];
  bookmarks: BookmarkItem[];
}

interface BookmarkSelectorProps {
  bookmarks: BookmarkItem[];
  selected: number[];
  isEdit: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onToggle: (id: number, isEdit: boolean) => void;
}

function BookmarkSelector({
  bookmarks,
  selected,
  isEdit,
  search,
  onSearchChange,
  onToggle,
}: BookmarkSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Select Bookmarks</Label>
      <Input
        placeholder="Search bookmarks..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
        {bookmarks.slice(0, 50).map((bookmark) => (
          <label
            key={bookmark.id}
            className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm hover:bg-muted"
          >
            <Checkbox
              checked={selected.includes(bookmark.id)}
              onCheckedChange={() => onToggle(bookmark.id, isEdit)}
            />
            {bookmark.favicon ? (
              // Favicons can come from arbitrary publisher hosts.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bookmark.favicon}
                alt=""
                className="h-4 w-4 rounded object-contain"
              />
            ) : null}
            <span className="truncate">{bookmark.title}</span>
            {bookmark.category ? (
              <Badge variant="outline" className="ml-auto shrink-0 text-xs">
                {bookmark.category.name}
              </Badge>
            ) : null}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{selected.length} selected</p>
    </div>
  );
}

export function CollectionManager({
  collections,
  bookmarks,
}: CollectionManagerProps) {
  const router = useRouter();
  const [selectedCollection, setSelectedCollection] = useState<CollectionItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<number[]>([]);
  const [bookmarkSearch, setBookmarkSearch] = useState("");
  const [editBookmarkIds, setEditBookmarkIds] = useState<number[]>([]);

  const handleCreate = async (_: ActionState | null, formData: FormData) => {
    return createCollection(null, {
      title: formData.get("title") as string,
      slug: formData.get("slug") as string,
      description: formData.get("description") as string,
      content: formData.get("content") as string,
      coverImage: formData.get("coverImage") as string,
      status: formData.get("status") as string,
      bookmarkIds: JSON.stringify(selectedBookmarkIds),
    });
  };

  const handleUpdate = async (_: ActionState | null, formData: FormData) => {
    return updateCollection(null, {
      id: selectedCollection?.id.toString() || "",
      title: formData.get("title") as string,
      slug: formData.get("slug") as string,
      description: formData.get("description") as string,
      content: formData.get("content") as string,
      coverImage: formData.get("coverImage") as string,
      status: formData.get("status") as string,
      bookmarkIds: JSON.stringify(editBookmarkIds),
    });
  };

  const handleDelete = async (_: ActionState | null, formData: FormData) => {
    return deleteCollection(null, { id: formData.get("id") as string });
  };

  const [createState, createAction] = useFormState(handleCreate, null);
  const [updateState, updateAction] = useFormState(handleUpdate, null);
  const [deleteState, deleteAction] = useFormState(handleDelete, null);

  useEffect(() => {
    if (createState?.success || updateState?.success || deleteState?.success) {
      toast.success("Collection updated successfully!");
      router.refresh();
      // Action state is an external async source; closing the completed
      // dialogs here is intentional synchronization rather than derived state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditDialogOpen(false);
      setIsDeleteDialogOpen(false);
      setSelectedBookmarkIds([]);
    }
  }, [createState?.success, updateState?.success, deleteState?.success, router]);

  useEffect(() => {
    if (createState?.error || updateState?.error || deleteState?.error) {
      toast.error(createState?.error || updateState?.error || deleteState?.error);
    }
  }, [createState?.error, updateState?.error, deleteState?.error]);

  const filteredBookmarks = bookmarks.filter(
    (b) =>
      b.title.toLowerCase().includes(bookmarkSearch.toLowerCase()),
  );

  const toggleBookmark = (id: number, isEdit: boolean) => {
    const setter = isEdit ? setEditBookmarkIds : setSelectedBookmarkIds;
    setter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Collections</h2>
        <div className="flex items-center gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button onClick={() => { setSelectedBookmarkIds([]); setBookmarkSearch(""); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Collection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Collection</DialogTitle>
              <DialogDescription>
                Create a curated list of tools.
              </DialogDescription>
            </DialogHeader>
            <form action={createAction} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g. Best Design Tools 2026"
                  onChange={(e) => {
                    const slugInput = document.getElementById("create-slug") as HTMLInputElement;
                    if (slugInput) {
                      slugInput.value = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "");
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="create-slug">Slug</Label>
                <Input id="create-slug" name="slug" required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={2} />
              </div>
              <div>
                <Label htmlFor="content">Content (Markdown)</Label>
                <Textarea id="content" name="content" rows={4} placeholder="Introduction text for the collection..." />
              </div>
              <div>
                <Label htmlFor="coverImage">Cover Image URL</Label>
                <Input id="coverImage" name="coverImage" placeholder="https://..." />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select name="status" className="w-full rounded-md border px-3 py-2 text-sm">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <BookmarkSelector
                bookmarks={filteredBookmarks}
                selected={selectedBookmarkIds}
                isEdit={false}
                search={bookmarkSearch}
                onSearchChange={setBookmarkSearch}
                onToggle={toggleBookmark}
              />
              <DialogFooter>
                <Button type="submit">Create Collection</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.map((collection) => (
              <TableRow key={collection.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Library className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{collection.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={collection.status === "published" ? "default" : "secondary"}>
                      {collection.status}
                    </Badge>
                    {collection.generationRunId ? (
                      <Badge variant="outline" className="text-xs">
                        {collection.status === "draft" ? "AI draft" : "AI-assisted"}
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {collection.publishedAt
                    ? new Date(collection.publishedAt).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {collection.status === "published" && (
                      <a href={`/collections/${collection.slug}`} target="_blank" rel="noopener">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={async () => {
                        setSelectedCollection(collection);
                        setBookmarkSearch("");
                        // Load existing bookmark IDs for this collection
                        const ids = await getCollectionBookmarkIdsAction(collection.id);
                        setEditBookmarkIds(ids);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedCollection(collection);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {collections.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No collections yet. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
            <DialogDescription>Update collection details and tools.</DialogDescription>
          </DialogHeader>
          <form action={updateAction} className="space-y-4">
            <input type="hidden" name="id" value={selectedCollection?.id?.toString()} />
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                name="title"
                defaultValue={selectedCollection?.title}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                name="slug"
                defaultValue={selectedCollection?.slug}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                defaultValue={selectedCollection?.description || ""}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="edit-content">Content (Markdown)</Label>
              <Textarea
                id="edit-content"
                name="content"
                defaultValue={selectedCollection?.content || ""}
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="edit-coverImage">Cover Image URL</Label>
              <Input
                id="edit-coverImage"
                name="coverImage"
                defaultValue={selectedCollection?.coverImage || ""}
              />
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <select
                name="status"
                defaultValue={selectedCollection?.status}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <BookmarkSelector
              bookmarks={filteredBookmarks}
              selected={editBookmarkIds}
              isEdit
              search={bookmarkSearch}
              onSearchChange={setBookmarkSearch}
              onToggle={toggleBookmark}
            />
            <DialogFooter>
              <Button type="submit">Update Collection</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Collection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedCollection?.title}&quot;?
              This will not delete the bookmarks themselves.
            </DialogDescription>
          </DialogHeader>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={selectedCollection?.id?.toString()} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Delete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
