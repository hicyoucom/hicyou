"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, Image as ImageIcon, Check } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  type: "logo" | "cover";
  label: string;
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  turnstileToken?: string | null;
}

export function ImageUpload({
  type,
  label,
  value,
  onChange,
  placeholder,
  description,
  disabled = false,
  turnstileToken,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPG, PNG, WebP, or AVIF");
      return;
    }

    // Validate file size (1MB for public submissions)
    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size is 1MB");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress("Uploading...");

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      // Add turnstile token if provided (for public submissions)
      if (turnstileToken) {
        formData.append("turnstileToken", turnstileToken);
      }

      setUploadProgress("Processing image...");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();

      setUploadProgress("Converting to AVIF...");

      // Update form value
      onChange(data.url);
      setPreview(data.url);

      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
      setPreview(value || null);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClear = () => {
    setPreview(null);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    onChange(url);
    setPreview(url || null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {preview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="relative rounded-lg border p-2 bg-muted/50">
          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
            <img
              src={preview}
              alt="Preview"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          className="flex-shrink-0"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {uploadProgress}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </>
          )}
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <Input
          type="url"
          value={value || ""}
          onChange={handleUrlChange}
          placeholder={placeholder || "Or paste image URL"}
          disabled={isUploading || disabled}
        />
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <ImageIcon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <div>
          <p>Supported: JPG, PNG, WebP, AVIF • Max 1MB</p>
          <p>Images will be optimized for web performance</p>
        </div>
      </div>
    </div>
  );
}

