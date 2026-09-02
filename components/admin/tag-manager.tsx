"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import {
  createTag,
  updateTag,
  deleteTag,
  mergeTags,
  ActionState,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus, Merge, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { ColorPicker } from "@/components/ui/color-picker";
import { Badge } from "@/components/ui/badge";

interface TagWithCount {
  id: number;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  count: number;
}

interface TagManagerProps {
  tags: TagWithCount[];
}

export function TagManager({ tags: initialTags }: TagManagerProps) {
  const router = useRouter();
  const tags = initialTags;
  const [selectedTag, setSelectedTag] = useState<TagWithCount | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [createColor, setCreateColor] = useState("#6366f1");
  const [editColor, setEditColor] = useState("#6366f1");
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTags = tags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.slug.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCreate = async (_: ActionState | null, formData: FormData) => {
    return createTag(null, {
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      color: formData.get("color") as string,
      icon: "",
    });
  };

  const handleUpdate = async (_: ActionState | null, formData: FormData) => {
    return updateTag(null, {
      id: selectedTag?.id.toString() || "",
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      color: formData.get("color") as string,
      icon: "",
    });
  };

  const handleDelete = async (_: ActionState | null, formData: FormData) => {
    return deleteTag(null, { id: formData.get("id") as string });
  };

  const handleMerge = async (_: ActionState | null, formData: FormData) => {
    return mergeTags(null, {
      sourceTagId: formData.get("sourceTagId") as string,
      targetTagId: formData.get("targetTagId") as string,
    });
  };

  const [createState, createAction] = useFormState(handleCreate, null);
  const [updateState, updateAction] = useFormState(handleUpdate, null);
  const [deleteState, deleteAction] = useFormState(handleDelete, null);
  const [mergeState, mergeAction] = useFormState(handleMerge, null);

  useEffect(() => {
    if (createState?.success || updateState?.success || deleteState?.success || mergeState?.success) {
      toast.success(mergeState?.message || "Tag updated successfully!");
      router.refresh();
      // These dialogs are controlled UI around useFormState; success becomes
      // observable only after React publishes the action state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditDialogOpen(false);
      setIsDeleteDialogOpen(false);
      setIsMergeDialogOpen(false);
    }
  }, [createState?.success, updateState?.success, deleteState?.success, mergeState?.success, mergeState?.message, router]);

  useEffect(() => {
    if (createState?.error || updateState?.error || deleteState?.error || mergeState?.error) {
      toast.error(createState?.error || updateState?.error || deleteState?.error || mergeState?.error);
    }
  }, [createState?.error, updateState?.error, deleteState?.error, mergeState?.error]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Tags</h2>
          <Input
            placeholder="Search tags..."
            className="w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button onClick={() => setCreateColor("#6366f1")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Tag</DialogTitle>
              <DialogDescription>
                Create a new tag for labeling bookmarks.
              </DialogDescription>
            </DialogHeader>
            <form action={createAction} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  onChange={(e) => {
                    const slugInput = document.getElementById("slug") as HTMLInputElement;
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
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" name="slug" required />
              </div>
              <ColorPicker
                value={createColor}
                onValueChange={setCreateColor}
                name="color"
                id="color"
                label="Tag Color"
              />
              <DialogFooter>
                <Button type="submit">Create Tag</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="text-center">Bookmarks</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <TagIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{tag.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{tag.slug}</TableCell>
                <TableCell>
                  {tag.color ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.color}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{tag.count}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedTag(tag);
                        setEditColor(tag.color || "#6366f1");
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
                        setSelectedTag(tag);
                        setMergeTargetId("");
                        setIsMergeDialogOpen(true);
                      }}
                    >
                      <Merge className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedTag(tag);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredTags.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {searchTerm ? "No tags found matching your search." : "No tags yet. Create one to get started."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>Update the tag details.</DialogDescription>
          </DialogHeader>
          <form action={updateAction} className="space-y-4">
            <input type="hidden" name="id" value={selectedTag?.id?.toString()} />
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={selectedTag?.name}
                required
                onChange={(e) => {
                  const slugInput = document.getElementById("edit-slug") as HTMLInputElement;
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
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                name="slug"
                defaultValue={selectedTag?.slug}
                required
              />
            </div>
            <ColorPicker
              value={editColor}
              onValueChange={setEditColor}
              name="color"
              id="edit-color"
              label="Tag Color"
              defaultValue={selectedTag?.color || "#6366f1"}
            />
            <DialogFooter>
              <Button type="submit">Update Tag</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Tag</DialogTitle>
            <DialogDescription>
              Merge &quot;{selectedTag?.name}&quot; into another tag. All bookmarks will be moved to the target tag, and &quot;{selectedTag?.name}&quot; will be deleted.
            </DialogDescription>
          </DialogHeader>
          <form action={mergeAction} className="space-y-4">
            <input type="hidden" name="sourceTagId" value={selectedTag?.id?.toString()} />
            <div>
              <Label>Target Tag</Label>
              <Select name="targetTagId" value={mergeTargetId} onValueChange={setMergeTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target tag..." />
                </SelectTrigger>
                <SelectContent>
                  {tags
                    .filter((t) => t.id !== selectedTag?.id)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name} ({t.count} bookmarks)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsMergeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!mergeTargetId}>
                Merge Tag
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedTag?.name}&quot;?
              {selectedTag && selectedTag.count > 0 && (
                <> This tag is used by {selectedTag.count} bookmarks.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={selectedTag?.id?.toString()} />
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
