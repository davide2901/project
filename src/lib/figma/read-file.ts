/**
 * Estrae testo dai TEXT node di un documento Figma (sola lettura).
 */

export function collectTextFromDocument(document: unknown): string {
  const chunks: string[] = [];
  walk(document, chunks);
  return chunks.map((c) => c.trim()).filter(Boolean).join("\n");
}

function walk(node: unknown, out: string[]): void {
  if (!node || typeof node !== "object") return;
  const n = node as {
    type?: string;
    characters?: string;
    children?: unknown[];
  };
  if (n.type === "TEXT" && typeof n.characters === "string") {
    out.push(n.characters);
  }
  if (Array.isArray(n.children)) {
    for (const child of n.children) walk(child, out);
  }
}

export async function fetchFigmaFileText(opts: {
  accessToken: string;
  fileKey: string;
  nodeId?: string | null;
}): Promise<{ name: string; text: string }> {
  const url = new URL(`https://api.figma.com/v1/files/${opts.fileKey}`);
  if (opts.nodeId) {
    url.searchParams.set("ids", opts.nodeId);
    url.searchParams.set("depth", "12");
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${opts.accessToken}` },
  });

  if (!res.ok) {
    throw new Error(
      `Lettura file Figma fallita (${res.status}): ${await res.text()}`,
    );
  }

  const data = (await res.json()) as {
    name?: string;
    document?: unknown;
  };

  const text = collectTextFromDocument(data.document);
  if (!text.trim()) {
    throw new Error(
      `Nessun text node trovato nel file Figma "${data.name ?? opts.fileKey}".`,
    );
  }

  return { name: data.name ?? opts.fileKey, text };
}
