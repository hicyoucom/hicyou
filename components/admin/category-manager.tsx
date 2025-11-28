"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoriesOrder,
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
import { Category } from "@/lib/data";
import { Pencil, Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { IconPicker } from "@/components/ui/icon-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { DynamicIcon } from "@/lib/icon-utils";

interface CategoryManagerProps {
  categories: Category[];
}

export function CategoryManager({ categories: initialCategories }: CategoryManagerProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(
    [...initialCategories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  );
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [createIcon, setCreateIcon] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [createColor, setCreateColor] = useState("#3498db");
  const [editColor, setEditColor] = useState("#3498db");
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Update local categories when initial data changes
  useEffect(() => {
    setCategories([...initialCategories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
  }, [initialCategories]);

  const handleCreate = async (_: ActionState | null, formData: FormData) => {
    const payload = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      slug: formData.get("slug") as string,
      color: formData.get("color") as string,
      icon: formData.get("icon") as string,
    };
    return createCategory(null, payload);
  };

  const handleUpdate = async (_: ActionState | null, formData: FormData) => {
    const payload = {
      id: selectedCategory?.id.toString() || "",
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      slug: formData.get("slug") as string,
      color: formData.get("color") as string,
      icon: formData.get("icon") as string,
    };
    return updateCategory(null, payload);
  };

  const handleDelete = async (_: ActionState | null, formData: FormData) => {
    return deleteCategory(null, { id: formData.get("id") as string });
  };

  const [createState, createAction] = useFormState(handleCreate, null);
  const [updateState, updateAction] = useFormState(handleUpdate, null);
  const [deleteState, deleteAction] = useFormState(handleDelete, null);

  // Move category up or down
  const moveCategory = (index: number, direction: "up" | "down") => {
    const newCategories = [...categories];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newCategories.length) {
      return;
    }

    // Swap positions
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
    
    setCategories(newCategories);
  };

  // Save category order
  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      const categoriesWithOrder = categories.map((cat, index) => ({
        id: cat.id,
        sortOrder: index,
      }));

      const result = await updateCategoriesOrder(null, { categories: categoriesWithOrder });
      
      if (result.success) {
        toast.success("Category order saved successfully!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to save category order");
      }
    } catch (error) {
      toast.error("Failed to save category order");
      console.error(error);
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Handle form submission results with useEffect to avoid infinite loops
  useEffect(() => {
    if (createState?.success || updateState?.success || deleteState?.success) {
      toast.success("Category updated successfully!");
      router.refresh(); // Refresh server component data
    }
  }, [createState?.success, updateState?.success, deleteState?.success, router]);

  useEffect(() => {
    if (createState?.error || updateState?.error || deleteState?.error) {
      toast.error(createState?.error || updateState?.error || deleteState?.error);
    }
  }, [createState?.error, updateState?.error, deleteState?.error]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Categories</h2>
        <div className="flex gap-2">
          <Button
            onClick={handleSaveOrder}
            disabled={isSavingOrder}
            variant="outline"
          >
            {isSavingOrder ? "Saving..." : "Save Order"}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setCreateIcon("");
                  setCreateColor("#3498db");
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription>
                Create a new category for organizing bookmarks.
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
                    // Also update the slug field
                    const slugInput = document.getElementById(
                      "slug",
                    ) as HTMLInputElement;
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
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>
              <ColorPicker
                value={createColor}
                onValueChange={setCreateColor}
                name="color"
                id="color"
                label="Category Color"
              />
              <IconPicker
                value={createIcon}
                onValueChange={setCreateIcon}
                name="icon"
                id="icon"
              />
              <DialogFooter>
                <Button type="submit">Create Category</Button>
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
              <TableHead className="w-[100px]">Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category, index) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveCategory(index, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveCategory(index, "down")}
                      disabled={index === categories.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>{category.description}</TableCell>
                <TableCell>
                  {category.color && (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.color}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {category.icon ? (
                    <div className="flex items-center gap-2">
                      <DynamicIcon name={category.icon} className="h-4 w-4" />
                      <span>{category.icon}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedCategory(category);
                        setEditIcon(category.icon || "");
                        setEditColor(category.color || "#3498db");
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update the category details.</DialogDescription>
          </DialogHeader>
          <form action={updateAction} className="space-y-4">
            <input type="hidden" name="id" value={selectedCategory?.id?.toString()} />
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={selectedCategory?.name}
                required
                onChange={(e) => {
                  // Also update the slug field
                  const slugInput = document.getElementById(
                    "edit-slug",
                  ) as HTMLInputElement;
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
                defaultValue={selectedCategory?.slug}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                defaultValue={selectedCategory?.description || ""}
              />
            </div>
            <ColorPicker
              value={editColor}
              onValueChange={setEditColor}
              name="color"
              id="edit-color"
              label="Category Color"
              defaultValue={selectedCategory?.color || "#3498db"}
            />
            <IconPicker
              value={editIcon}
              onValueChange={setEditIcon}
              name="icon"
              id="edit-icon"
            />
            <DialogFooter>
              <Button type="submit">Update Category</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={selectedCategory?.id?.toString()} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
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
