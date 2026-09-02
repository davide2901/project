import { GoogleGenAI } from "@google/genai";

import {
  buildDiscoverySystemPrompt,
  buildDiscoveryUserPrompt,
} from "@/lib/ai/discovery-prompts";
import {
  discoveredOfferItemSchema,
  discoveryResultJsonSchema,
  discoveryResultSchema,
  type DiscoveryResult,
} from "@/lib/ai/discovery-schema";
import { isAiMockEnabled, mockDiscoverOffers } from "@/lib/ai/mock";
import {
  DISCOVERY_ERROR_FALLBACK,
  toUserFacingError,
} from "@/lib/ai/user-facing-error";
import type { JobPreference } from "@/lib/types/database";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

/** Budget ricerca web (secondi) prima di passare al JSON senza grounding. */
const SEARCH_BUDGET_MS = Number(process.env.DISCOVERY_SEARCH_MS ?? 18_000);

export type DiscoveryProfileInput = {
  full_name: string | null;
  skills: string[];
  cv_fallback_text: string | null;
  job_preference: JobPreference;
  companies_of_interest: string[];
};

export type DiscoverOptions = {
  /** `interactive` = una chiamata grounded; `full` = ricerca + JSON (cron). */
  mode?: "interactive" | "full";
};

function logDiscovery(
  stage: string,
  extra: Record<string, unknown> = {},
): void {
  console.info(
    JSON.stringify({
      scope: "discovery",
      stage,
      model: MODEL,
      t: Date.now(),
      ...extra,
    }),
  );
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY mancante. Aggiungila nelle variabili d'ambiente oppure attiva USE_AI_MOCK=true.",
    );
  }
  return new GoogleGenAI({ apiKey });
}

function tryParseJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function parseDiscovery(text: string): DiscoveryResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { offers: [], search_notes: ["Nessun risultato dalla ricerca."] };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(trimmed);
  } catch {
    payload = tryParseJsonObject(trimmed);
  }

  if (!payload) {
    return {
      offers: [],
      search_notes: ["Risposta non strutturata: nessun'offerta estratta."],
    };
  }

  const parsed = discoveryResultSchema.safeParse(payload);
  if (!parsed.success) {
    const raw = payload as { offers?: unknown; search_notes?: unknown };
    if (Array.isArray(raw.offers)) {
      const offers = raw.offers
        .map((item) => discoveredOfferItemSchemaSafe(item))
        .filter(Boolean) as DiscoveryResult["offers"];
      return {
        offers,
        search_notes: Array.isArray(raw.search_notes)
          ? (raw.search_notes as string[]).map(String)
          : ["Alcune offerte non erano valide ed sono state scartate."],
      };
    }
    return {
      offers: [],
      search_notes: [
        `Output discovery incompleto: ${parsed.error.issues
          .slice(0, 2)
          .map((i) => i.message)
          .join("; ")}`,
      ],
    };
  }

  return parsed.data;
}

function discoveredOfferItemSchemaSafe(
  item: unknown,
): DiscoveryResult["offers"][number] | null {
  const r = discoveredOfferItemSchema.safeParse(item);
  return r.success ? r.data : null;
}

function preferenceAllows(
  type: DiscoveryResult["offers"][number]["position_type"],
  preference: JobPreference,
): boolean {
  if (preference === "entrambi" || type === "non_chiaro") return true;
  if (preference === "lavoro") return type === "lavoro";
  if (preference === "stage") return type === "stage";
  return true;
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<{ ok: true; value: T } | { ok: false }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const raced = await Promise.race([
      promise.then((value) => ({ ok: true as const, value })),
      new Promise<{ ok: false }>((resolve) => {
        timer = setTimeout(() => resolve({ ok: false }), ms);
      }),
    ]);
    return raced;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function collectSearchNotes(
  ai: GoogleGenAI,
  profile: DiscoveryProfileInput,
): Promise<string | null> {
  const skills = profile.skills.slice(0, 12).join(", ") || "non specificate";
  const companies =
    profile.companies_of_interest.slice(0, 8).join(", ") || "nessuna";
  const pref =
    profile.job_preference === "lavoro"
      ? "solo lavoro (no stage)"
      : profile.job_preference === "stage"
        ? "solo stage/tirocinio/internship"
        : "lavoro o stage";

  const t0 = Date.now();
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Cerca offerte di lavoro reali in Italia (o remote IT) adatte a questo profilo.
Preferenza: ${pref}.
Competenze: ${skills}.
Aziende di interesse: ${companies}.

Elenca fino a 8 offerte trovate sul web con: azienda, ruolo, luogo, tipo (lavoro/stage), URL se disponibile, breve descrizione, perché matcha.
Solo offerte reali; se non trovi nulla, dillo chiaramente.`,
      config: {
        temperature: 0.35,
        tools: [{ googleSearch: {} }],
      },
    });
    const text = response.text?.trim() || null;
    logDiscovery("search_notes_ok", {
      ms: Date.now() - t0,
      chars: text?.length ?? 0,
    });
    return text;
  } catch (err) {
    logDiscovery("search_notes_error", {
      ms: Date.now() - t0,
      error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
    });
    return null;
  }
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /quota|rate.?limit|RESOURCE_EXHAUSTED|"code"\s*:\s*429|exceeded your current quota/i.test(
    msg,
  );
}

async function generateDiscoveryJson(
  ai: GoogleGenAI,
  contents: string,
  systemInstruction: string,
  schema: Record<string, unknown>,
): Promise<DiscoveryResult> {
  const t0 = Date.now();
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.35,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
      },
    });
    const parsed = parseDiscovery(response.text ?? "");
    logDiscovery("json_ok", { ms: Date.now() - t0, offers: parsed.offers.length });
    return parsed;
  } catch (err) {
    logDiscovery("json_schema_retry", {
      ms: Date.now() - t0,
      error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
      quota: isQuotaError(err),
    });
    if (isQuotaError(err)) throw err;
    const t1 = Date.now();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `${contents}

Rispondi SOLO con JSON valido: { "offers": [...], "search_notes": [...] }.
offers può essere [].`,
      config: {
        systemInstruction,
        temperature: 0.35,
        responseMimeType: "application/json",
      },
    });
    const parsed = parseDiscovery(response.text ?? "");
    logDiscovery("json_retry_ok", {
      ms: Date.now() - t1,
      offers: parsed.offers.length,
    });
    return parsed;
  }
}

/**
 * Una sola chiamata: Google Search + testo JSON (senza responseMimeType).
 * Più veloce del two-step; adatta al bottone "Cerca offerte" su Vercel.
 */
async function discoverInteractiveSingleCall(
  ai: GoogleGenAI,
  profile: DiscoveryProfileInput,
): Promise<DiscoveryResult> {
  const systemInstruction = `${buildDiscoverySystemPrompt(profile)}

Usa la ricerca web. Alla fine rispondi SOLO con un oggetto JSON (niente markdown fuori dal JSON) con chiavi "offers" e "search_notes".`;
  const contents = `${buildDiscoveryUserPrompt(profile)}

Dopo la ricerca, restituisci SOLO JSON:
{"offers":[{"company_name":"...","role_title":"...","position_type":"lavoro|stage|non_chiaro","location":"...","source_url":null,"snippet":"...","match_reason":"..."}],"search_notes":["..."]}`;

  const t0 = Date.now();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction,
      temperature: 0.35,
      tools: [{ googleSearch: {} }],
    },
  });
  const parsed = parseDiscovery(response.text ?? "");
  logDiscovery("interactive_ok", {
    ms: Date.now() - t0,
    offers: parsed.offers.length,
    chars: response.text?.length ?? 0,
  });
  return parsed;
}

async function discoverFullTwoStep(
  ai: GoogleGenAI,
  profile: DiscoveryProfileInput,
): Promise<DiscoveryResult> {
  const systemInstruction = buildDiscoverySystemPrompt(profile);
  const schema = discoveryResultJsonSchema as Record<string, unknown>;

  const searchRace = await withTimeout(
    collectSearchNotes(ai, profile),
    SEARCH_BUDGET_MS,
  );
  const searchNotes = searchRace.ok ? searchRace.value : null;
  if (!searchRace.ok) {
    logDiscovery("search_notes_timeout", { budgetMs: SEARCH_BUDGET_MS });
  }

  const basePrompt = buildDiscoveryUserPrompt(profile);
  const contents = searchNotes
    ? `${basePrompt}

---
NOTE DALLA RICERCA WEB (fonte primaria; non inventare offerte assenti da qui):
${searchNotes}
---`
    : `${basePrompt}

Nota: ricerca web non disponibile o troppo lenta. Restituisci offers: [] e spiega in search_notes, oppure solo offerte di cui sei molto sicuro senza inventare URL.`;

  const result = await generateDiscoveryJson(
    ai,
    contents,
    systemInstruction,
    schema,
  );
  const notes = [...(result.search_notes ?? [])];
  if (!searchNotes) {
    notes.push(
      "Ricerca web non disponibile in questa chiamata; risultati senza grounding.",
    );
  }
  return { ...result, search_notes: notes };
}

export async function discoverOffersForProfile(
  profile: DiscoveryProfileInput,
  options: DiscoverOptions = {},
): Promise<DiscoveryResult> {
  const mode = options.mode ?? "interactive";
  const t0 = Date.now();
  logDiscovery("start", {
    mode,
    skills: profile.skills.length,
    pref: profile.job_preference,
  });

  if (isAiMockEnabled()) {
    const mocked = await mockDiscoverOffers();
    return {
      ...mocked,
      offers: mocked.offers.filter((o) =>
        preferenceAllows(o.position_type, profile.job_preference),
      ),
    };
  }

  try {
    const ai = getClient();
    let result: DiscoveryResult;

    if (mode === "interactive") {
      try {
        result = await discoverInteractiveSingleCall(ai, profile);
      } catch (err) {
        logDiscovery("interactive_fail_fallback_full", {
          error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
          quota: isQuotaError(err),
        });
        if (isQuotaError(err)) throw err;
        result = await discoverFullTwoStep(ai, profile);
      }
    } else {
      result = await discoverFullTwoStep(ai, profile);
    }

    const filtered = {
      ...result,
      offers: result.offers.filter((o) =>
        preferenceAllows(o.position_type, profile.job_preference),
      ),
    };
    logDiscovery("done", {
      mode,
      ms: Date.now() - t0,
      offers: filtered.offers.length,
    });
    return filtered;
  } catch (err) {
    logDiscovery("fatal", {
      ms: Date.now() - t0,
      error: err instanceof Error ? err.message.slice(0, 300) : "unknown",
    });
    throw new Error(toUserFacingError(err, DISCOVERY_ERROR_FALLBACK));
  }
}
