import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

type Messages = Record<string, unknown>;

// Deep-merge so any key missing in a locale falls back to the English value,
// instead of erroring/showing the raw key. Lets us add new copy in en (+ the
// source language) and roll out other locales incrementally.
function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const key of Object.keys(override)) {
    const b = out[key];
    const o = override[key];
    out[key] =
      b && o && typeof b === "object" && typeof o === "object" && !Array.isArray(b) && !Array.isArray(o)
        ? deepMerge(b as Messages, o as Messages)
        : o;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Ensure a valid locale is used
  if (
    !locale ||
    !routing.locales.includes(locale as (typeof routing.locales)[number])
  ) {
    locale = routing.defaultLocale;
  }

  const en = (await import(`./messages/${routing.defaultLocale}.json`)).default as Messages;
  const messages =
    locale === routing.defaultLocale
      ? en
      : deepMerge(en, (await import(`./messages/${locale}.json`)).default as Messages);

  return { locale, messages };
});
