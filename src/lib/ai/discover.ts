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

export type DiscoveryProfileInput = {
  full_name: string | null;
  skills: string[];
  cv_fallback_text: string | null;
  job_preference: JobPreference;
  companies_of_interest: string[];
};

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
    // Tollerante: se c'è un array offers grezzo, prova a filtrare item validi
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
    return response.text?.trim() || null;
  } catch {
    return null;
  }
}

async function generateDiscoveryJson(
  ai: GoogleGenAI,
  contents: string,
  systemInstruction: string,
  schema: Record<string, unknown>,
): Promise<DiscoveryResult> {
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
    return parseDiscovery(response.text ?? "");
  } catch {
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
    return parseDiscovery(response.text ?? "");
  }
}

export async function discoverOffersForProfile(
  profile: DiscoveryProfileInput,
): Promise<DiscoveryResult> {
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
    const systemInstruction = buildDiscoverySystemPrompt(profile);
    const schema = discoveryResultJsonSchema as Record<string, unknown>;

    const searchNotes = await collectSearchNotes(ai, profile);
    const basePrompt = buildDiscoveryUserPrompt(profile);
    const contents = searchNotes
      ? `${basePrompt}

---
NOTE DALLA RICERCA WEB (fonte primaria; non inventare offerte assenti da qui):
${searchNotes}
---`
      : `${basePrompt}

Nota: ricerca web non disponibile. Restituisci offers: [] e spiega in search_notes, oppure solo offerte di cui sei molto sicuro senza inventare URL.`;

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
    return {
      ...result,
      offers: result.offers.filter((o) =>
        preferenceAllows(o.position_type, profile.job_preference),
      ),
      search_notes: notes,
    };
  } catch (err) {
    throw new Error(toUserFacingError(err, DISCOVERY_ERROR_FALLBACK));
  }
}
