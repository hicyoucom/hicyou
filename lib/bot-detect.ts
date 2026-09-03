const BOT_UA =
  /bot\b|crawl|spider|slurp|baidu|bing|google(?!-image)|yandex|duckduck|sogou|facebookexternalhit|whatsapp|telegram|twitterbot|linkedin|embedly|pinterest|applebot|ia_archiver|semrush|ahrefs|petal|mj12|seznam|naver/i;

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return BOT_UA.test(userAgent);
}
