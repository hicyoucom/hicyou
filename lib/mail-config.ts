const DEFAULT_PUBLIC_EMAIL = "noreply@example.com";

export function getMailFrom(): string {
  const configuredFrom = process.env.MAIL_FROM?.trim();
  if (configuredFrom) {
    return configuredFrom;
  }

  const publicEmail =
    process.env.NEXT_PUBLIC_MAIL?.trim() || DEFAULT_PUBLIC_EMAIL;
  return `HiCyou Team <${publicEmail}>`;
}

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
