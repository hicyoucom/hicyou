import Exa from "exa-js";

import { logger } from "@/lib/logger";

/** Fetch optional long-form page context from the configured Exa account. */
export async function fetchWebsiteContext(url: string): Promise<string> {
  if (!process.env.EXASEARCH_API_KEY) return "";
  try {
    const exa = new Exa(process.env.EXASEARCH_API_KEY);
    return JSON.stringify(
      await exa.getContents([url], {
        text: { maxCharacters: 20_000 },
        livecrawl: "fallback",
        livecrawlTimeout: 10_000,
      }),
    );
  } catch (error) {
    logger.warn("Exa search failed, continuing without it", error);
    return "";
  }
}
