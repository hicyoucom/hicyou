"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DynamicIcon, POPULAR_ICONS } from "@/lib/icon-utils";
import { Search, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface IconPickerProps {
  value?: string;
  onValueChange: (value: string) => void;
  label?: string;
  name?: string;
  id?: string;
}

export function IconPicker({ value, onValueChange, label = "Icon", name = "icon", id }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [manualInput, setManualInput] = useState(value || "");
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Sync hidden input value with value prop
  useEffect(() => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = value || "";
    }
    if (value) {
      setManualInput(value);
    }
  }, [value]);

  const filteredIcons = POPULAR_ICONS.filter((icon) =>
    icon.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (iconName: string) => {
    onValueChange(iconName);
    setManualInput(iconName);
    // Update hidden input immediately
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = iconName;
    }
    setOpen(false);
    setSearchTerm("");
  };

  const handleManualInput = (inputValue: string) => {
    setManualInput(inputValue);
    onValueChange(inputValue);
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = inputValue;
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="icon-picker">{label}</Label>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            id="icon-picker"
          >
            {value ? (
              <div className="flex items-center gap-2">
                <DynamicIcon name={value} className="h-4 w-4" />
                <span>{value}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">选择图标</span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>选择图标</DialogTitle>
            <DialogDescription>
              从 Lucide 图标库中选择或直接输入图标名称
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="browse" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="browse">
                <Search className="h-4 w-4 mr-2" />
                浏览图标
              </TabsTrigger>
              <TabsTrigger value="input">
                <Type className="h-4 w-4 mr-2" />
                输入名称
              </TabsTrigger>
            </TabsList>

            {/* Browse Tab */}
            <TabsContent value="browse" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索图标..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex-1 overflow-y-auto border rounded-md p-4">
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {filteredIcons.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => handleSelect(iconName)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 p-3 rounded-md border transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        value === iconName && "bg-primary text-primary-foreground border-primary"
                      )}
                      title={iconName}
                    >
                      <DynamicIcon name={iconName} className="h-5 w-5" />
                      <span className="text-xs truncate w-full text-center">{iconName}</span>
                    </button>
                  ))}
                </div>
                {filteredIcons.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    未找到匹配的图标
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Input Tab */}
            <TabsContent value="input" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
              <div className="space-y-3">
                <Label htmlFor="icon-input">Icon Name</Label>
                <Input
                  id="icon-input"
                  placeholder="例如: Bot, Sparkles, Rocket, Code..."
                  value={manualInput}
                  onChange={(e) => handleManualInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  输入 Lucide 图标名称。查看所有可用图标: 
                  <a 
                    href="https://lucide.dev/icons/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-1"
                  >
                    lucide.dev/icons
                  </a>
                </p>
              </div>

              {/* Preview */}
              {manualInput && (
                <div className="border rounded-lg p-6 bg-muted/50">
                  <div className="text-sm font-medium mb-3">预览:</div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center h-16 w-16 rounded-lg border-2 bg-background">
                      <DynamicIcon 
                        name={manualInput} 
                        className="h-8 w-8" 
                        fallback={
                          <div className="text-xs text-muted-foreground text-center">
                            未找到<br/>图标
                          </div>
                        }
                      />
                    </div>
                    <div>
                      <div className="font-medium">{manualInput}</div>
                      <div className="text-xs text-muted-foreground">
                        {manualInput ? "图标名称" : "请输入图标名称"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Common examples */}
              <div className="space-y-2">
                <div className="text-sm font-medium">常用示例:</div>
                <div className="flex flex-wrap gap-2">
                  {["Bot", "Sparkles", "Rocket", "Zap", "Star", "Heart", "Code", "Terminal", "Box", "Package"].map((example) => (
                    <Button
                      key={example}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleManualInput(example)}
                      className="h-8"
                    >
                      <DynamicIcon name={example} className="h-3 w-3 mr-1" />
                      {example}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {value && (
              <div className="flex items-center justify-between pt-3 border-t mt-3">
                <span className="text-sm text-muted-foreground">当前选择:</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onValueChange("");
                    setManualInput("");
                    if (hiddenInputRef.current) {
                      hiddenInputRef.current.value = "";
                    }
                  }}
                >
                  清除
                </Button>
              </div>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>
      <input type="hidden" ref={hiddenInputRef} name={name} id={id} value={value || ""} />
    </div>
  );
}

