import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DynamicIcon, POPULAR_ICONS } from "@/lib/icon-utils";

test("every picker option is available without the dynamic registry", () => {
  for (const name of POPULAR_ICONS) {
    const html = renderToStaticMarkup(
      <DynamicIcon name={name} fallback={<span>missing</span>} />,
    );
    expect(html).toContain("<svg");
    expect(html).not.toContain("missing");
  }
});
test("legacy names resolve and prototype names cannot become components", () => {
  expect(renderToStaticMarkup(<DynamicIcon name="Home" />)).toContain(
    "lucide-house",
  );
  expect(renderToStaticMarkup(<DynamicIcon name="X" />)).toContain("lucide-x");
  expect(renderToStaticMarkup(<DynamicIcon name="constructor" />)).toContain(
    "lucide-folder",
  );
  expect(
    renderToStaticMarkup(
      <DynamicIcon name="UnknownIcon" fallback={<span>fallback</span>} />,
    ),
  ).toContain("fallback");
});
