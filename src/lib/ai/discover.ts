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
import {
  buildDiscoveryAngles,
  DISCOVERY_OFFER_CAP,
  mergeDiscoveryOffers,
  type DiscoveryAngle,
} from "@/lib/discovery/multi-search";
import type { JobPreference } from "@/lib/types/database";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

/** Budget per angolo di ricerca (ms) nel percorso full/cron. */
const SEARCH_BUDGET_MS = Number(process.env.DISCOVERY_SEARCH_MS ?? 18_000);

/** Offerte richieste per singola query parallela. */
const OFFERS_PER_ANGLE = 5;

export type DiscoveryProfileInput = {
  full_name: string | null;
  skills: string[];
  cv_fallback_text: string | null;
  job_preference: JobPreference;
  companies_of_interest: string[];
};

export type DiscoverOptions = {
  /** `interactive` = ricerche parallele grounded; `full` = note + JSON (cron). */
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

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /quota|rate.?limit|RESOURCE_EXHAUSTED|"code"\s*:\s*429|exceeded your current quota/i.test(
    msg,
  );
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

async function collectSearchNotesForAngle(
  ai: GoogleGenAI,
  profile: DiscoveryProfileInput,
  angle: DiscoveryAngle,
): Promise<string | null> {
  const t0 = Date.now();
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Cerca offerte di lavoro reali sul web.
Focus ricerca: ${angle.focus}.

Elenca fino a ${OFFERS_PER_ANGLE} offerte con: azienda, ruolo, luogo, tipo (lavoro/stage), URL se disponibile, breve descrizione, perché matcha il profilo (${profile.skills.slice(0, 8).join(", ") || "vedi CV"}).
Solo offerte reali; se non trovi nulla, dillo chiaramente.`,
      config: {
        temperature: 0.35,
        tools: [{ googleSearch: {} }],
      },
    });
    const text = response.text?.trim() || null;
    logDiscovery("search_notes_ok", {
      angle: angle.id,
      ms: Date.now() - t0,
      chars: text?.length ?? 0,
    });
    return text ? `[${angle.label}]\n${text}` : null;
  } catch (err) {
    logDiscovery("search_notes_error", {
      angle: angle.id,
      ms: Date.now() - t0,
      error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
      quota: isQuotaError(err),
    });
    if (isQuotaError(err)) throw err;
    return null;
  }
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

/** Una ricerca grounded → JSON, focalizzata su un angolo. */
async function discoverAngleGrounded(
  ai: GoogleGenAI,
  profile: DiscoveryProfileInput,
  angle: DiscoveryAngle,
): Promise<DiscoveryResult> {
  const systemInstruction = `${buildDiscoverySystemPrompt(profile)}

Focus di questa ricerca: ${angle.focus}.
Usa la ricerca web. Restituisci SOLO JSON con "offers" (max ${OFFERS_PER_ANGLE}) e "search_notes".`;

  const contents = `${buildDiscoveryUserPrompt(profile)}

ANGOLO DI RICERCA: ${angle.label}
${angle.focus}

Dopo la ricerca, restituisci SOLO JSON:
{"offers":[{"company_name":"...","role_title":"...","position_type":"lavoro|stage|non_chiaro","location":"...","source_url":null,"snippet":"...","match_reason":"..."}],"search_notes":["..."]}
Massimo ${OFFERS_PER_ANGLE} offerte per questo angolo.`;

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
  logDiscovery("angle_ok", {
    angle: angle.id,
    ms: Date.now() - t0,
    offers: parsed.offers.length,
    chars: response.text?.length ?? 0,
  });
  return {
    ...parsed,
    offers: parsed.offers.slice(0, OFFERS_PER_ANGLE),
    search_notes: [
      `Angolo «${angle.label}»: ${parsed.offers.length} offerte.`,
      ...(parsed.search_notes ?? []),
    ],
  };
}

/**
 * 2–3 ricerche Google parallele (skills/tipo/aziende), poi merge + dedupe.
 */
async function discoverInteractiveMultiSearch(
  ai: GoogleGenAI,
  profile: DiscoveryProfileInput,
): Promise<DiscoveryResult> {
  const angles = buildDiscoveryAngles(profile);
  logDiscovery("multi_start", {
    angles: angles.map((a) => a.id),
  });

  const settled = await Promise.allSettled(
    angles.map((angle) => discoverAngleGrounded(ai, profile, angle)),
  );

  const batches: DiscoveryResult["offers"][] = [];
  const notes: string[] = [
    `Ricerche parallele: ${angles.map((a) => a.label).join(", ")}.`,
  ];
  let quotaHit: unknown = null;
  let hardFail: unknown = null;

  settled.forEach((outcome, i) => {
    const angle = angles[i]!;
    if (outcome.status === "fulfilled") {
      batches.push(outcome.value.offers);
      notes.push(...(outcome.value.search_notes ?? []).slice(0, 2));
      return;
    }
    const err = outcome.reason;
    logDiscovery("angle_fail", {
      angle: angle.id,
      error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
      quota: isQuotaError(err),
    });
    if (isQuotaError(err)) quotaHit = err;
    else hardFail = err;
    notes.push(`Angolo «${angle.label}» non riuscito.`);
  });

  if (batches.length === 0) {
    if (quotaHit) throw quotaHit;
    if (hardFail) throw hardFail;
    return {
      offers: [],
      search_notes: notes.length
        ? notes
        : ["Nessun risultato dalle ricerche parallele."],
    };
  }

  const offers = mergeDiscoveryOffers(batches, DISCOVERY_OFFER_CAP);
  logDiscovery("multi_merged", {
    batches: batches.length,
    offers: offers.length,
  });
  return { offers, search_notes: notes };
}

async function discoverFullTwoStep(
  ai: GoogleGenAI,
  profile: DiscoveryProfileInput,
): Promise<DiscoveryResult> {
  const systemInstruction = buildDiscoverySystemPrompt(profile);
  const schema = discoveryResultJsonSchema as Record<string, unknown>;
  const angles = buildDiscoveryAngles(profile);

  const noteParts: string[] = [];
  try {
    const noteResults = await Promise.all(
      angles.map(async (angle) => {
        const raced = await withTimeout(
          collectSearchNotesForAngle(ai, profile, angle),
          SEARCH_BUDGET_MS,
        );
        if (!raced.ok) {
          logDiscovery("search_notes_timeout", {
            angle: angle.id,
            budgetMs: SEARCH_BUDGET_MS,
          });
          return null;
        }
        return raced.value;
      }),
    );
    for (const part of noteResults) {
      if (part) noteParts.push(part);
    }
  } catch (err) {
    if (isQuotaError(err)) throw err;
    logDiscovery("search_notes_batch_error", {
      error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
    });
  }

  const searchNotes = noteParts.length > 0 ? noteParts.join("\n\n---\n\n") : null;
  const basePrompt = buildDiscoveryUserPrompt(profile);
  const contents = searchNotes
    ? `${basePrompt}

---
NOTE DALLA RICERCA WEB (fonte primaria; non inventare offerte assenti da qui):
${searchNotes}
---
Restituisci fino a ${DISCOVERY_OFFER_CAP} offerte uniche.`
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
  } else {
    notes.unshift(
      `Note da ${noteParts.length} ricerche: ${angles.map((a) => a.label).join(", ")}.`,
    );
  }
  return {
    ...result,
    offers: result.offers.slice(0, DISCOVERY_OFFER_CAP),
    search_notes: notes,
  };
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
        result = await discoverInteractiveMultiSearch(ai, profile);
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
      offers: result.offers
        .filter((o) => preferenceAllows(o.position_type, profile.job_preference))
        .slice(0, DISCOVERY_OFFER_CAP),
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
