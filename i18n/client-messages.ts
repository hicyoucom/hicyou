export const CLIENT_NAMESPACES = [
  "common",
  "nav",
  "footer",
  "language",
  "mobileDiscovery",
] as const;

export function clientMessages(
  messages: Record<string, unknown>,
  extra: string[] = [],
) {
  return Object.fromEntries(
    [...CLIENT_NAMESPACES, ...extra].map((key) => [key, messages[key]]),
  );
}
