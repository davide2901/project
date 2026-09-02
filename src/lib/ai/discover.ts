import { GoogleGenAI } from "@google/genai";

import {
  buildDiscoverySystemPrompt,
  buildDiscoveryUserPrompt,
} from "@/lib/ai/discovery-prompts";
import {
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
    throw new Error("Gemini non ha restituito offerte. Riprova.");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(trimmed);
  } catch {
    payload = tryParseJsonObject(trimmed);
  }

  if (!payload) {
    throw new Error("Gemini non ha restituito un JSON valido. Riprova.");
  }

  const parsed = discoveryResultSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      `Output discovery non valido: ${parsed.error.issues
        .slice(0, 3)
        .map((i) => i.message)
        .join("; ")}`,
    );
  }

  return parsed.data;
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

/**
 * Google Search non può coesistere con responseMimeType JSON.
 * Prima raccogliamo note di ricerca (testo), poi strutturiamo in JSON.
 */
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
    const text = response.text?.trim();
    return text || null;
  } catch {
    return null;
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

  const ai = getClient();
  const systemInstruction = buildDiscoverySystemPrompt(profile);
  const schema = discoveryResultJsonSchema as Record<string, unknown>;

  const searchNotes = await collectSearchNotes(ai, profile);
  const basePrompt = buildDiscoveryUserPrompt(profile);
  const contents = searchNotes
    ? `${basePrompt}

---
NOTE DALLA RICERCA WEB (usa queste come fonte primaria; non inventare offerte non citate):
${searchNotes}
---`
    : basePrompt;

  try {
    // Mai combinare googleSearch + responseMimeType application/json
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
    const result = parseDiscovery(response.text ?? "");
    const notes = [...result.search_notes];
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
