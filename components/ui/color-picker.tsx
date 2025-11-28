"use client";

import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// Predefined color palette
export const PRESET_COLORS = [
  "#1abc9c",
  "#16a085",
  "#2ecc71",
  "#27ae60",
  "#3498db",
  "#2980b9",
  "#9b59b6",
  "#8e44ad",
  "#34495e",
  "#2c3e50",
  "#f1c40f",
  "#f39c12",
  "#e67e22",
  "#d35400",
  "#e74c3c",
  "#c0392b",
  "#ecf0f1",
  "#bdc3c7",
  "#95a5a6",
  "#7f8c8d",
  "#ff6b6b",
  "#ff9f43",
  "#ffcd3c",
  "#6c5ce7",
  "#a29bfe",
  "#81ecec",
  "#55efc4",
  "#fab1a0",
  "#ffeaa7",
] as const;

interface ColorPickerProps {
  value?: string;
  onValueChange: (value: string) => void;
  label?: string;
  name?: string;
  id?: string;
  defaultValue?: string;
}

export function ColorPicker({
  value,
  onValueChange,
  label = "Color",
  name = "color",
  id,
  defaultValue,
}: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(value || defaultValue || PRESET_COLORS[0]);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Sync hidden input value
  useEffect(() => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = selectedColor;
    }
  }, [selectedColor]);

  // Update when value prop changes
  useEffect(() => {
    if (value && value !== selectedColor) {
      setSelectedColor(value);
    }
  }, [value]);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    onValueChange(color);
  };

  return (
    <div className="space-y-3">
      <Label htmlFor={id}>{label}</Label>
      
      {/* Color Preview */}
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
        <div
          className="h-10 w-10 rounded-md border-2 border-border shadow-sm"
          style={{ backgroundColor: selectedColor }}
        />
        <div className="flex-1">
          <div className="text-sm font-medium">{selectedColor}</div>
          <div className="text-xs text-muted-foreground">Selected color</div>
        </div>
      </div>

      {/* Color Grid */}
      <div className="grid grid-cols-6 sm:grid-cols-7 md:grid-cols-10 gap-2 p-3 border rounded-lg bg-background">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => handleColorSelect(color)}
            className={cn(
              "relative h-10 w-full rounded-md border-2 transition-all",
              "hover:scale-110 hover:shadow-md",
              selectedColor === color
                ? "border-primary ring-2 ring-primary ring-offset-2"
                : "border-border hover:border-primary/50"
            )}
            style={{ backgroundColor: color }}
            title={color}
          >
            {selectedColor === color && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className="h-5 w-5 text-white drop-shadow-md" strokeWidth={3} />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        ref={hiddenInputRef}
        name={name}
        id={id}
        value={selectedColor}
      />
    </div>
  );
}


