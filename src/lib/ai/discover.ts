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
import type { SeenOfferRef } from "@/lib/ai/discovery-prompts";
import {
  buildDiscoveryAngles,
  DISCOVERY_OFFER_CAP,
  DISCOVERY_REFRESH_MIN_NEW,
  filterNovelOffers,
  mergeDiscoveryOffers,
  type DiscoveryAngle,
} from "@/lib/discovery/multi-search";
import {
  enrichOffersWithUrls,
  type GroundingWebRef,
} from "@/lib/discovery/offer-links";
import type { JobPreference } from "@/lib/types/database";

export type DiscoveryOutcome = DiscoveryResult & {
  /** Presente se Google Search non ha funzionato. */
  degraded?: "quota" | "no_grounding";
};

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

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
  /** Offerte già in archivio (qualsiasi status): da scartare e sostituire. */
  seen_offers?: SeenOfferRef[];
};

export type DiscoverOptions = {
  /** `interactive` = ricerche parallele grounded; `full` = note + JSON (cron). */
  mode?: "interactive" | "full";
  /** Secondo giro con angoli «alternative» se poche novità. */
  allowRefresh?: boolean;
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

function extractGroundingWebRefs(response: {
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: GroundingWebRef }>;
    };
  }>;
}): GroundingWebRef[] {
  const out: GroundingWebRef[] = [];
  for (const candidate of response.candidates ?? []) {
    for (const chunk of candidate.groundingMetadata?.groundingChunks ?? []) {
      if (chunk.web?.uri) out.push(chunk.web);
    }
  }
  return out;
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
  const seen = profile.seen_offers ?? [];
  const systemInstruction = `${buildDiscoverySystemPrompt(profile)}

Focus di questa ricerca: ${angle.focus}.
Usa la ricerca web. Restituisci SOLO JSON con "offers" (max ${OFFERS_PER_ANGLE}) e "search_notes".
Scarta qualsiasi offerta già nella lista «già trovate».`;

  const contents = `${buildDiscoveryUserPrompt(profile, seen)}

ANGOLO DI RICERCA: ${angle.label}
${angle.focus}

Dopo la ricerca, restituisci SOLO JSON:
{"offers":[{"company_name":"...","role_title":"...","position_type":"lavoro|stage|non_chiaro","location":"...","source_url":"https://...","snippet":"...","match_reason":"..."}],"search_notes":["..."]}
source_url = URL dell'annuncio o pagina careers se trovato nella ricerca; altrimenti null.
Massimo ${OFFERS_PER_ANGLE} offerte NUOVE per questo angolo.`;

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
  const groundingUrls = extractGroundingWebRefs(response);
  const parsed = parseDiscovery(response.text ?? "");
  const enriched = enrichOffersWithUrls(parsed.offers, {
    text: response.text ?? "",
    groundingUrls,
  });
  logDiscovery("angle_ok", {
    angle: angle.id,
    ms: Date.now() - t0,
    offers: enriched.length,
    urls: enriched.filter((o) => o.source_url).length,
    grounding: groundingUrls.length,
    chars: response.text?.length ?? 0,
  });
  return {
    ...parsed,
    offers: enriched.slice(0, OFFERS_PER_ANGLE),
    search_notes: [
      `Angolo «${angle.label}»: ${enriched.length} offerte.`,
      ...(parsed.search_notes ?? []),
    ],
  };
}

/**
 * 2–3 ricerche Google parallele (skills/tipo/aziende), poi merge + dedupe.
 * Se il grounding è in quota, fallback a una generazione JSON senza Search.
 */
async function discoverInteractiveMultiSearch(
  ai: GoogleGenAI,
  profile: DiscoveryProfileInput,
  opts: { refresh?: boolean } = {},
): Promise<DiscoveryOutcome> {
  const angles = buildDiscoveryAngles(profile, { refresh: opts.refresh });
  logDiscovery("multi_start", {
    angles: angles.map((a) => a.id),
    refresh: Boolean(opts.refresh),
    seen: profile.seen_offers?.length ?? 0,
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

  if (batches.length > 0) {
    const offers = mergeDiscoveryOffers(batches, DISCOVERY_OFFER_CAP);
    logDiscovery("multi_merged", {
      batches: batches.length,
      offers: offers.length,
    });
    return { offers, search_notes: notes };
  }

  // Grounding esaurito o fallito: prova JSON senza Search (stesso modello).
  logDiscovery("grounding_fallback_json", {
    quota: Boolean(quotaHit),
  });
  try {
    const systemInstruction = buildDiscoverySystemPrompt(profile);
    const schema = discoveryResultJsonSchema as Record<string, unknown>;
    const result = await generateDiscoveryJson(
      ai,
      `${buildDiscoveryUserPrompt(profile, profile.seen_offers ?? [])}

Nota operativa: la ricerca web (Google Search) non è disponibile per quota/errore.
Restituisci comunque fino a 6 offerte plausibili e tipiche del mercato italiano/remote IT
allineate al profilo (aziende reali, ruoli credibili). source_url = null.
Non ripetere offerte già trovate. Se proprio non hai nulla di sensato, offers: [].`,
      systemInstruction,
      schema,
    );
    const failNotes = notes.filter((n) => n.includes("non riuscito"));
    return {
      ...result,
      degraded: quotaHit ? "quota" : "no_grounding",
      search_notes: [
        quotaHit
          ? "Ricerca web Gemini in quota (429): risultati senza Google Search."
          : "Ricerca web non disponibile; risultati senza grounding.",
        ...failNotes.slice(0, 3),
        ...(result.search_notes ?? []).slice(0, 2),
      ],
    };
  } catch (err) {
    if (quotaHit) throw quotaHit;
    if (hardFail) throw hardFail;
    throw err;
  }
}

async function discoverFullTwoStep(
  ai: GoogleGenAI,
  profile: DiscoveryProfileInput,
): Promise<DiscoveryOutcome> {
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
  const basePrompt = buildDiscoveryUserPrompt(profile, profile.seen_offers ?? []);
  const contents = searchNotes
    ? `${basePrompt}

---
NOTE DALLA RICERCA WEB (fonte primaria; non inventare offerte assenti da qui):
${searchNotes}
---
Restituisci fino a ${DISCOVERY_OFFER_CAP} offerte uniche e NON già nella lista «già trovate».`
    : `${basePrompt}

Nota: ricerca web non disponibile o troppo lenta. Restituisci offers: [] e spiega in search_notes, oppure solo offerte di cui sei molto sicuro senza inventare URL.`;

  const result = await generateDiscoveryJson(
    ai,
    contents,
    systemInstruction,
    schema,
  );
  const enriched = enrichOffersWithUrls(result.offers, {
    text: searchNotes ?? contents,
  });
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
    offers: enriched.slice(0, DISCOVERY_OFFER_CAP),
    search_notes: notes,
  };
}

export async function discoverOffersForProfile(
  profile: DiscoveryProfileInput,
  options: DiscoverOptions = {},
): Promise<DiscoveryOutcome> {
  const mode = options.mode ?? "interactive";
  const allowRefresh = options.allowRefresh ?? mode === "interactive";
  const t0 = Date.now();
  const seen = profile.seen_offers ?? [];
  logDiscovery("start", {
    mode,
    skills: profile.skills.length,
    pref: profile.job_preference,
    seen: seen.length,
  });

  if (isAiMockEnabled()) {
    const mocked = await mockDiscoverOffers();
    return {
      ...mocked,
      offers: filterNovelOffers(
        mocked.offers.filter((o) =>
          preferenceAllows(o.position_type, profile.job_preference),
        ),
        seen,
      ),
    };
  }

  try {
    const ai = getClient();
    let result: DiscoveryOutcome;

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

    let offers = filterNovelOffers(
      result.offers.filter((o) =>
        preferenceAllows(o.position_type, profile.job_preference),
      ),
      seen,
    );
    const notes = [...(result.search_notes ?? [])];
    const skippedFirst = result.offers.length - offers.length;
    if (skippedFirst > 0) {
      notes.push(`Scartate ${skippedFirst} offerte già viste al primo giro.`);
    }

    // Non rilanciare Google Search se siamo già in quota: brucia limiti e non aiuta.
    const canRefresh =
      allowRefresh &&
      offers.length < DISCOVERY_REFRESH_MIN_NEW &&
      result.degraded !== "quota";

    if (canRefresh) {
      const expandedSeen: SeenOfferRef[] = [
        ...seen,
        ...offers.map((o) => ({
          company_name: o.company_name,
          role_title: o.role_title,
        })),
        ...result.offers.map((o) => ({
          company_name: o.company_name,
          role_title: o.role_title,
        })),
      ];
      logDiscovery("refresh_start", {
        novelSoFar: offers.length,
        seen: expandedSeen.length,
      });
      try {
        const refreshProfile = { ...profile, seen_offers: expandedSeen };
        const refresh =
          mode === "interactive"
            ? await discoverInteractiveMultiSearch(ai, refreshProfile, {
                refresh: true,
              })
            : await discoverFullTwoStep(ai, refreshProfile);
        if (refresh.degraded && !result.degraded) {
          result = { ...result, degraded: refresh.degraded };
        }
        const more = filterNovelOffers(
          refresh.offers.filter((o) =>
            preferenceAllows(o.position_type, profile.job_preference),
          ),
          [
            ...expandedSeen.map((o) => ({
              ...o,
              source_url: null as string | null,
            })),
            ...offers,
          ],
        );
        if (more.length > 0) {
          notes.push(
            `Secondo giro alternative: +${more.length} offerte nuove.`,
          );
          offers = filterNovelOffers([...offers, ...more], seen);
        } else {
          notes.push(
            "Secondo giro alternative: nessuna offerta nuova aggiuntiva.",
          );
        }
        notes.push(...(refresh.search_notes ?? []).slice(0, 2));
      } catch (err) {
        logDiscovery("refresh_fail", {
          error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
          quota: isQuotaError(err),
        });
        if (isQuotaError(err) && offers.length === 0) throw err;
        notes.push("Secondo giro di ricerca non riuscito.");
      }
    }

    const filtered: DiscoveryOutcome = {
      offers: enrichOffersWithUrls(offers.slice(0, DISCOVERY_OFFER_CAP), {
        text: notes.join("\n"),
      }),
      search_notes: notes,
      degraded: result.degraded,
    };
    logDiscovery("done", {
      mode,
      ms: Date.now() - t0,
      offers: filtered.offers.length,
      skipped: skippedFirst,
      degraded: filtered.degraded ?? null,
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
