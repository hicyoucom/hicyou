"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SelectableCategory {
  id: string;
  name: string;
  groupKey?: string;
  disabledAsPrimary?: boolean;
}

interface CategorySelectorProps {
  categories: SelectableCategory[];
  value: string[];
  onChange: (categoryIds: string[]) => void;
  primaryLabel: string;
  primaryPlaceholder: string;
  additionalLabel: string;
  helperText: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
}

export function CategorySelector({
  categories,
  value,
  onChange,
  primaryLabel,
  primaryPlaceholder,
  additionalLabel,
  helperText,
  allowEmpty = false,
  emptyLabel = "No category",
  disabled = false,
}: CategorySelectorProps) {
  const primaryId = value[0] ?? "";
  const selected = new Set(value);
  const secondaryCount = Math.max(value.length - 1, 0);

  const selectPrimary = (nextPrimary: string) => {
    if (nextPrimary === "none") {
      onChange([]);
      return;
    }
    onChange([
      nextPrimary,
      ...value.filter((categoryId) => categoryId !== nextPrimary),
    ].slice(0, 3));
  };

  const toggleSecondary = (categoryId: string) => {
    if (!primaryId || categoryId === primaryId) return;
    if (selected.has(categoryId)) {
      onChange(value.filter((id) => id !== categoryId));
      return;
    }
    if (value.length < 3) onChange([...value, categoryId]);
  };

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <div className="space-y-2">
        <Label>{primaryLabel}</Label>
        <Select
          value={primaryId || (allowEmpty ? "none" : undefined)}
          onValueChange={selectPrimary}
          disabled={disabled}
          required={!allowEmpty}
        >
          <SelectTrigger>
            <SelectValue placeholder={primaryPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {allowEmpty ? <SelectItem value="none">{emptyLabel}</SelectItem> : null}
            {categories.map((category) => (
              <SelectItem
                key={category.id}
                value={category.id}
                disabled={category.disabledAsPrimary}
              >
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>{additionalLabel}</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {secondaryCount}/2
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories
            .filter((category) => category.id !== primaryId)
            .map((category) => {
              const isSelected = selected.has(category.id);
              const isDisabled = disabled || !primaryId || (!isSelected && value.length >= 3);
              return (
                <Button
                  key={category.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  onClick={() => toggleSecondary(category.id)}
                  className={cn(
                    "h-8 rounded-full px-3 text-xs",
                    isSelected && "border-primary bg-primary/10 text-primary hover:bg-primary/15",
                  )}
                >
                  {isSelected ? <Check className="mr-1 h-3.5 w-3.5" /> : null}
                  {category.name}
                </Button>
              );
            })}
        </div>
        <p className="text-xs text-muted-foreground">{helperText}</p>
      </div>
    </div>
  );
}
