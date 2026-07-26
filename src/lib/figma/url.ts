/**
 * Estrae file key e node id da un URL Figma.
 * Supporta /file/, /design/, /proto/, /board/.
 */
export function parseFigmaUrl(url: string): {
  fileKey: string;
  nodeId: string | null;
} | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.endsWith("figma.com")) return null;

    const match = parsed.pathname.match(
      /\/(file|design|proto|board|slides)\/([a-zA-Z0-9]+)/,
    );
    if (!match?.[2]) return null;

    const nodeParam = parsed.searchParams.get("node-id");
    const nodeId = nodeParam ? nodeParam.replace(/-/g, ":") : null;

    return { fileKey: match[2], nodeId };
  } catch {
    return null;
  }
}
