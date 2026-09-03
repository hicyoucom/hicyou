import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { translateTexts, TranslateInputError } from "@/lib/translate";

export async function POST(request: Request) {
  try {
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { texts, targetLocale } = await request.json();

    try {
      const translations = await translateTexts(texts, targetLocale, {
        signal: request.signal,
      });
      return NextResponse.json({ translations });
    } catch (error) {
      if (error instanceof TranslateInputError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    logger.error("Translation error:", error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
