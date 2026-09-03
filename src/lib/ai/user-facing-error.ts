export function isQuotaError(err: unknown): boolean {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : JSON.stringify(err ?? "");
  return /quota|rate.?limit|RESOURCE_EXHAUSTED|"code"\s*:\s*429|exceeded your current quota/i.test(
    raw,
  );
}

/**
 * Converte errori SDK/API (spesso JSON grezzo) in messaggi comprensibili.
 */
export function toUserFacingError(
  err: unknown,
  fallback = "Qualcosa non ha funzionato. Riprova tra poco.",
): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : fallback;

  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  if (isQuotaError(trimmed)) {
    return "Limite richieste AI raggiunto. Attendi qualche minuto e riprova.";
  }

  if (
    /no longer available|is not found for API version|update your code to use models\//i.test(
      trimmed,
    )
  ) {
    return "Modello AI non più disponibile. Aggiorna GEMINI_MODEL e riprova.";
  }

  // Corpi JSON Gemini / Google API
  if (
    trimmed.startsWith("{") ||
    trimmed.includes('"error"') ||
    trimmed.includes("INVALID_ARGUMENT") ||
    trimmed.includes("Tool use with a response mime type") ||
    trimmed.includes("response mime type")
  ) {
    return fallback;
  }

  // Messaggi troppo tecnici o lunghi
  if (trimmed.length > 180 || /stack|exception|ECONN|fetch failed/i.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

export const DISCOVERY_ERROR_FALLBACK =
  "Ricerca offerte non disponibile al momento. Riprova tra poco.";

export const GENERATION_ERROR_FALLBACK =
  "Non siamo riusciti a generare la candidatura. Riprova tra poco.";
