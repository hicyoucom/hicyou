/**
 * AI Configuration for Content Generation
 * Supports OpenAI-compatible APIs (OpenAI, DeepSeek, Kimi, etc.)
 */

import OpenAI from "openai";

// Get AI configuration from environment variables
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.openai.com/v1";
const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";

/**
 * Check if AI is configured
 */
export function isAIConfigured(): boolean {
  return !!AI_API_KEY;
}

/**
 * Create OpenAI client with custom configuration
 * Works with any OpenAI-compatible API
 */
export function getAIClient(): OpenAI {
  if (!AI_API_KEY) {
    throw new Error("AI_API_KEY is not configured");
  }

  return new OpenAI({
    apiKey: AI_API_KEY,
    baseURL: AI_BASE_URL,
  });
}

/**
 * Get the configured model name
 */
export function getAIModel(): string {
  return AI_MODEL;
}

/**
 * Generate content using AI
 */
export async function generateAIContent(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const client = getAIClient();
  const model = getAIModel();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  try {
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("AI generation error:", error);
    throw error;
  }
}

/**
 * Generate tagline and description for a website
 */


export async function generateWebsiteContent(params: {
  url: string;
  title: string;
  metaDescription?: string;
  searchResults?: string;
}): Promise<{
  tagline: string;
  description: string;
  keyFeatures: string[];
  useCases: string[];
  faqs: { question: string; answer: string }[];
}> {
  const { url, title, metaDescription, searchResults } = params;

  const systemPrompt = `You are a helpful assistant that creates concise, engaging content for a website directory.
IMPORTANT: All output must be in English.`;

  const userPrompt = `Based on the following information about a website, generate content for a directory listing.

Website: ${title}
URL: ${url}
${metaDescription ? `Meta Description: ${metaDescription}` : ""}
${searchResults ? `Additional Context: ${searchResults}` : ""}

Please generate the following fields in JSON format:
1. "tagline": A catchy one-sentence tagline (max 120 chars).
2. "description": A 65-80 word introduction paragraph answering "What is ${title}?".
3. "keyFeatures": An array of 6 key features (short strings).
4. "useCases": An array of 3-6 use cases (short strings).
5. "faqs": An array of 4-6 FAQs, each with "question" and "answer" fields.

Guidelines:
- All content MUST be in English.
- Description should be concise and informative.
- Key features should be bullet points.
- Use cases should be specific scenarios.
- FAQs should address common user questions based on the features.

Format your response as valid JSON:
{
  "tagline": "...",
  "description": "...",
  "keyFeatures": ["...", ...],
  "useCases": ["...", ...],
  "faqs": [{"question": "...", "answer": "..."}, ...]
}`;

  try {
    // Use unified client and model
    const client = getAIClient();
    const model = getAIModel();

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000, // Adjusted max tokens as 8000 might be too high for some models
    });

    const content = response.choices[0]?.message?.content || "";
    console.log("AI Response:", content); // Debug log

    // Try to parse JSON response
    // Remove markdown code blocks and any text before/after the JSON object
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : content;

    const result = JSON.parse(jsonString);

    return {
      tagline: result.tagline || "",
      description: result.description || "",
      keyFeatures: result.keyFeatures || [],
      useCases: result.useCases || [],
      faqs: result.faqs || [],
    };
  } catch (error) {
    console.error("Failed to generate website content:", error);

    // Fallback
    return {
      tagline: metaDescription?.substring(0, 120) || "A great website",
      description: metaDescription || "No description available.",
      keyFeatures: [],
      useCases: [],
      faqs: [],
    };
  }
}


