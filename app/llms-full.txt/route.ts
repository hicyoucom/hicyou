import { directory } from "@/directory.config";
import {
  getAllCategories,
  getAllCollections,
  getTagsWithCount,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const [categories, tags, collections] = await Promise.all([
    getAllCategories(),
    getTagsWithCount(),
    getAllCollections(false),
  ]);
  const content = `# ${directory.name}

> ${directory.description}

## Categories
${categories.map((item) => `- [${item.name}](${directory.baseUrl}/c/${item.slug})`).join("\n")}

## Tags
${tags.map((item) => `- [${item.name}](${directory.baseUrl}/tags/${item.slug})`).join("\n")}

## Collections
${collections.map((item) => `- [${item.title}](${directory.baseUrl}/collections/${item.slug})`).join("\n")}

## API
- [OpenAPI](${directory.baseUrl}/api/v1/openapi)
- [Summary](${directory.baseUrl}/llms.txt)
`;
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600",
    },
  });
}
