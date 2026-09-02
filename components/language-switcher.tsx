"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const currentLocale = useLocale() as Locale;
  const t = useTranslations("language");
  const pathname = usePathname();
  const router = useRouter();

  const handleChange = (newLocale: string) => {
    if (newLocale === currentLocale) return;
    router.replace(pathname, { locale: newLocale as Locale });
  };

  return (
    <Select value={currentLocale} onValueChange={handleChange}>
      <SelectTrigger
        aria-label={compact ? t("switchTo") : undefined}
        className={cn(
          "h-8 w-auto gap-1.5 border-none px-2 text-xs shadow-none",
          compact && "w-8 justify-center gap-0 px-0 [&>svg:last-child]:hidden",
        )}
      >
        <Globe className="h-3.5 w-3.5" />
        <SelectValue className={compact ? "sr-only" : undefined} />
      </SelectTrigger>
      <SelectContent>
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale} className="text-xs">
            {localeNames[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
