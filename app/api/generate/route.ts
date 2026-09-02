import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { isAIConfigured, generateWebsiteContent } from "@/lib/ai-config";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
    }

    const { url, title, metaDescription, searchResults } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 },
      );
    }

    logAdminAction({
      actorEmail: auth.email,
      action: "ai.generate_content",
      request,
      status: 200,
      metadata: { url },
    });

    // Check if AI is configured
    if (!isAIConfigured()) {
      return NextResponse.json(
        {
          error: "AI is not configured. Please set AI_API_KEY in your environment variables.",
          tagline: metaDescription?.substring(0, 120) || "",
          description: metaDescription || "",
        },
        { status: 503 },
      );
    }

    // Parse search results if provided
    let parsedResults = "";
    if (searchResults) {
      try {
        const results = typeof searchResults === "string"
          ? JSON.parse(searchResults)
          : searchResults;
        parsedResults = JSON.stringify(results, null, 2);
      } catch (error) {
        logger.warn("Failed to parse search results:", error);
        parsedResults = searchResults;
      }
    }

    // Generate tagline and description using AI
    const content = await generateWebsiteContent({
      url,
      title: title || "",
      metaDescription,
      searchResults: parsedResults,
    });

    return NextResponse.json({
      tagline: content.tagline,
      description: content.description,
      keyFeatures: content.keyFeatures,
      useCases: content.useCases,
      faqs: content.faqs,
      // For backward compatibility
      overview: content.description,
    });
  } catch (error) {
    logger.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 },
    );
  }
}
