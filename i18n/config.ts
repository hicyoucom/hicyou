export const locales = ["en", "zh", "ja", "es", "pt", "de", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
  es: "Español",
  pt: "Português",
  de: "Deutsch",
  fr: "Français",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇺🇸",
  zh: "🇨🇳",
  ja: "🇯🇵",
  es: "🇪🇸",
  pt: "🇧🇷",
  de: "🇩🇪",
  fr: "🇫🇷",
};
