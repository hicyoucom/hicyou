import { directory } from "@/directory.config";

export function GET() {
  const content = `# ${directory.name}

> ${directory.description}

## Main pages

- [Home](${directory.baseUrl})
- [Categories](${directory.baseUrl}/c)
- [Tags](${directory.baseUrl}/tags)
- [Collections](${directory.baseUrl}/collections)
- [Submit](${directory.baseUrl}/submit)
- [About](${directory.baseUrl}/about)
- [Open source](${directory.baseUrl}/open-source)

## API

- [Sitemap](${directory.baseUrl}/sitemap.xml)
- [OpenAPI](${directory.baseUrl}/api/v1/openapi)
`;
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600",
    },
  });
}
