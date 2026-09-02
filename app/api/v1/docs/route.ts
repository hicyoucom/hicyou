// Human-facing API docs, rendered by Scalar from the OpenAPI spec. Public.
const HTML = `<!doctype html>
<html>
  <head>
    <title>Hi Cyou Directory API — Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
  </head>
  <body>
    <script id="api-reference" data-url="/api/v1/openapi"></script>
    <script
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.62.4"
      integrity="sha384-8krtlmjW90KNKDXFfcFls2ueiU+9/jzPmL/C2r7Y2NPh9KWCau8HyweAvBvm/y0y"
      crossorigin="anonymous"
    ></script>
  </body>
</html>`;

export function GET() {
  return new Response(HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
