/**
 * Salvaguardia file originale Figma.
 *
 * REGOLA D'ORO: mai scrivere sul file originale del candidato.
 * Qualsiasi modifica testuale DEVE passare da una working copy
 * (file duplicato / branch / pagina dedicata) distinta dall'originale.
 *
 * Nota API: la REST API pubblica di Figma non espone ancora
 * "duplicate file" / "create branch". La duplicazione avviene via:
 * 1) webhook/plugin interno (FIGMA_DUPLICATE_WEBHOOK_URL), oppure
 * 2) file working-copy pre-provisionato (FIGMA_WORKING_COPY_FILE_KEY).
 * In entrambi i casi il gatekeeper rifiuta scritture se fileKey === originale.
 */

import { parseFigmaUrl } from "@/lib/figma/url";

export type FigmaTextUpdate = {
  nodeId: string;
  characters: string;
};

export type FigmaWorkingCopy = {
  /** File key su cui è permesso scrivere (MAI uguale all'originale). */
  fileKey: string;
  /** File key originale — solo lettura. */
  originalFileKey: string;
  /** Come è stata ottenuta la copia. */
  strategy: "webhook_duplicate" | "provisioned_working_copy";
};

export class FigmaOriginalGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FigmaOriginalGuardError";
  }
}

function getToken(): string {
  const token = process.env.FIGMA_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "FIGMA_ACCESS_TOKEN mancante: impossibile contattare l'API Figma.",
    );
  }
  return token;
}

/**
 * Crea (o risolve) una working copy PRIMA di qualsiasi scrittura.
 * Fallisce se non può garantire fileKey !== originalFileKey.
 */
export async function createWorkingCopy(
  originalFileKey: string,
): Promise<FigmaWorkingCopy> {
  if (!originalFileKey.trim()) {
    throw new FigmaOriginalGuardError("file key originale mancante.");
  }

  const webhook = process.env.FIGMA_DUPLICATE_WEBHOOK_URL?.trim();
  if (webhook) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        action: "duplicate_file",
        original_file_key: originalFileKey,
        name_prefix: "SuMisura — candidatura",
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Duplicazione Figma fallita (${res.status}): ${await res.text()}`,
      );
    }

    const data = (await res.json()) as { file_key?: string; fileKey?: string };
    const copyKey = data.file_key ?? data.fileKey;
    if (!copyKey || copyKey === originalFileKey) {
      throw new FigmaOriginalGuardError(
        "SAFEGUARD: la duplicazione non ha prodotto un file key distinto dall'originale. Abort.",
      );
    }

    return {
      fileKey: copyKey,
      originalFileKey,
      strategy: "webhook_duplicate",
    };
  }

  const provisioned = process.env.FIGMA_WORKING_COPY_FILE_KEY?.trim();
  if (provisioned) {
    if (provisioned === originalFileKey) {
      throw new FigmaOriginalGuardError(
        "SAFEGUARD: FIGMA_WORKING_COPY_FILE_KEY coincide con l'originale. Abort.",
      );
    }
    return {
      fileKey: provisioned,
      originalFileKey,
      strategy: "provisioned_working_copy",
    };
  }

  throw new Error(
    "Nessuna strategia di working copy configurata (FIGMA_DUPLICATE_WEBHOOK_URL o FIGMA_WORKING_COPY_FILE_KEY). " +
      "Rifiuto di modificare il file originale.",
  );
}

/**
 * Applica aggiornamenti testuali SOLO sulla working copy.
 * Se target === originale → errore hard (nessuna chiamata di scrittura).
 */
export async function applyTextUpdatesToWorkingCopy(
  working: FigmaWorkingCopy,
  updates: FigmaTextUpdate[],
): Promise<void> {
  if (working.fileKey === working.originalFileKey) {
    throw new FigmaOriginalGuardError(
      "SAFEGUARD: tentativo di scrivere sul file Figma originale bloccato.",
    );
  }

  if (updates.length === 0) return;

  // Plugin relay: la REST API non scrive characters sui TEXT node.
  // Qualsiasi scrittura deve colpire ESCLUSIVAMENTE working.fileKey.
  const relay = process.env.FIGMA_TEXT_WRITE_WEBHOOK_URL?.trim();
  if (!relay) {
    throw new Error(
      "FIGMA_TEXT_WRITE_WEBHOOK_URL non configurato: impossibile scrivere text nodes in sicurezza.",
    );
  }

  const res = await fetch(relay, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({
      // Explicit: never send originalFileKey as write target
      file_key: working.fileKey,
      original_file_key: working.originalFileKey,
      forbid_original: true,
      updates,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Scrittura Figma sulla working copy fallita (${res.status}): ${await res.text()}`,
    );
  }
}

/**
 * Pipeline obbligatoria: duplica/risolvi copia → poi (e solo poi) scrivi.
 */
export async function safelyMutateFigmaCvText(opts: {
  originalFileUrlOrKey: string;
  updates: FigmaTextUpdate[];
}): Promise<FigmaWorkingCopy> {
  const parsed = parseFigmaUrl(opts.originalFileUrlOrKey);
  const originalFileKey =
    parsed?.fileKey ?? opts.originalFileUrlOrKey.trim();

  // STEP 1 — working copy PRIMA di qualsiasi modifica
  const working = await createWorkingCopy(originalFileKey);

  // STEP 2 — scrittura solo sulla copia
  await applyTextUpdatesToWorkingCopy(working, opts.updates);

  return working;
}

/** True se token + (duplicate webhook o working copy) + text write webhook. */
export function isFigmaWriteConfigured(): boolean {
  const token = Boolean(process.env.FIGMA_ACCESS_TOKEN?.trim());
  const write = Boolean(process.env.FIGMA_TEXT_WRITE_WEBHOOK_URL?.trim());
  const copy =
    Boolean(process.env.FIGMA_DUPLICATE_WEBHOOK_URL?.trim()) ||
    Boolean(process.env.FIGMA_WORKING_COPY_FILE_KEY?.trim());
  return token && write && copy;
}

export type FigmaWriteResult =
  | { ok: true; workingFileKey: string; strategy: FigmaWorkingCopy["strategy"] }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

/**
 * Dopo la generazione: prova a scrivere il CV ottimizzato sulla working copy.
 * Non lancia: fallimenti soft (la candidatura testuale resta valida).
 */
export async function pushOptimizedCvToFigma(opts: {
  originalFileUrlOrKey: string;
  optimizedCvText: string;
}): Promise<FigmaWriteResult> {
  if (!isFigmaWriteConfigured()) {
    return {
      ok: false,
      skipped: true,
      reason:
        "Figma scrittura non configurata (token + working copy + webhook text).",
    };
  }

  const nodeId =
    process.env.FIGMA_CV_TEXT_NODE_ID?.trim() || "__cv_body__";

  try {
    const working = await safelyMutateFigmaCvText({
      originalFileUrlOrKey: opts.originalFileUrlOrKey,
      updates: [{ nodeId, characters: opts.optimizedCvText }],
    });
    return {
      ok: true,
      workingFileKey: working.fileKey,
      strategy: working.strategy,
    };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      error: err instanceof Error ? err.message : "Scrittura Figma fallita.",
    };
  }
}

/**
 * Lettura sola (sicura sull'originale): estrae testo dai TEXT node.
 */
export async function extractTextFromFigmaFile(
  fileUrlOrKey: string,
): Promise<string> {
  const parsed = parseFigmaUrl(fileUrlOrKey);
  const fileKey = parsed?.fileKey ?? fileUrlOrKey.trim();
  if (!fileKey) {
    throw new Error("URL/file key Figma non valido.");
  }

  const token = getToken();
  const url = new URL(`https://api.figma.com/v1/files/${fileKey}`);
  if (parsed?.nodeId) {
    url.searchParams.set("ids", parsed.nodeId);
    url.searchParams.set("depth", "10");
  }

  const res = await fetch(url, {
    headers: { "X-Figma-Token": token },
  });

  if (!res.ok) {
    throw new Error(
      `Lettura Figma fallita (${res.status}): ${await res.text()}`,
    );
  }

  const data = (await res.json()) as {
    document?: unknown;
    name?: string;
  };

  const chunks: string[] = [];
  collectTextNodes(data.document, chunks);

  const joined = chunks.map((c) => c.trim()).filter(Boolean).join("\n");
  if (!joined) {
    throw new Error(
      `Nessun text node trovato nel file Figma "${data.name ?? fileKey}".`,
    );
  }

  return joined;
}

function collectTextNodes(node: unknown, out: string[]): void {
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
    for (const child of n.children) collectTextNodes(child, out);
  }
}
