import { NextResponse } from "next/server";
import { isAIConfigured, generateWebsiteContent } from "@/lib/ai-config";

export async function POST(request: Request) {
  try {
    const { url, title, metaDescription, searchResults } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 },
      );
    }

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
        console.warn("Failed to parse search results:", error);
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating content:", errorMessage);
    return NextResponse.json(
      { error: `Failed to generate content: ${errorMessage}` },
      { status: 500 },
    );
  }
}
