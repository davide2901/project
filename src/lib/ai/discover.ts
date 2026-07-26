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
  const contents = buildDiscoveryUserPrompt(profile);
  const systemInstruction = buildDiscoverySystemPrompt(profile);
  const schema = discoveryResultJsonSchema as Record<string, unknown>;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.35,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseJsonSchema: schema,
      },
    });
    const result = parseDiscovery(response.text ?? "");
    return {
      ...result,
      offers: result.offers.filter((o) =>
        preferenceAllows(o.position_type, profile.job_preference),
      ),
    };
  } catch (firstError) {
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
      const result = parseDiscovery(response.text ?? "");
      return {
        ...result,
        offers: result.offers.filter((o) =>
          preferenceAllows(o.position_type, profile.job_preference),
        ),
        search_notes: [
          ...result.search_notes,
          "Ricerca web non disponibile in questa chiamata; risultati senza grounding.",
        ],
      };
    } catch {
      const message =
        firstError instanceof Error
          ? firstError.message
          : "Errore sconosciuto in discovery.";
      throw new Error(message);
    }
  }
}
