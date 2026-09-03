import { GoogleGenAI } from "@google/genai";

import {
  companyIntelJsonSchema,
  companyIntelPayloadSchema,
  type CompanyIntelPayload,
} from "@/lib/ai/company-intel-schema";
import { isAiMockEnabled } from "@/lib/ai/mock";
import {
  DISCOVERY_ERROR_FALLBACK,
  toUserFacingError,
} from "@/lib/ai/user-facing-error";
import { normalizeSalaryFields } from "@/lib/discovery/salary";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
const INTEL_TTL_DAYS = Number(process.env.COMPANY_INTEL_TTL_DAYS ?? 10);

export function intelExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + INTEL_TTL_DAYS * 24 * 60 * 60 * 1000);
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

function sanitizePayload(raw: CompanyIntelPayload): CompanyIntelPayload {
  const salary =
    raw.salary_hint == null
      ? null
      : (() => {
          const n = normalizeSalaryFields({
            salary_min: raw.salary_hint.min,
            salary_max: raw.salary_hint.max,
            salary_source: "stima",
          });
          if (n.salary_min == null) return null;
          return {
            min: n.salary_min,
            max: n.salary_max,
            note: raw.salary_hint.note,
          };
        })();

  return {
    ...raw,
    one_liner: raw.one_liner.trim().slice(0, 280),
    pros: raw.pros.map((s) => s.trim()).filter(Boolean).slice(0, 4),
    cons: raw.cons.map((s) => s.trim()).filter(Boolean).slice(0, 4),
    interview_tips: raw.interview_tips
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5),
    sources: raw.sources
      .map((s) => ({
        label: s.label.trim(),
        url: s.url?.trim() || null,
      }))
      .filter((s) => s.label)
      .slice(0, 8),
    salary_hint: salary,
  };
}

function mockIntel(
  companyName: string,
  roleTitle: string,
): CompanyIntelPayload {
  return sanitizePayload({
    overall_signal: "misto",
    one_liner: `${companyName}: ritmo sostenuto, focus su delivery; esperienze miste su work-life balance.`,
    pros: [
      "Progetti tecnici spesso rilevanti sul CV",
      "Team giovani e autonomia operativa",
    ],
    cons: [
      "Ritmo alto e priorità che cambiano spesso",
      "Processi HR / crescita non sempre chiari",
    ],
    interview_tips: [
      `Prepara 2 esempi concreti sul ruolo ${roleTitle}`,
      "Chiedi stack, on-call e policy remote/hybrid",
      "Verifica RAL e benefit: le stime pubbliche non sono certe",
    ],
    sources: [
      { label: "Glassdoor (ricerca)", url: null },
      { label: "Mock USE_AI_MOCK", url: null },
    ],
    confidence: "bassa",
    salary_hint: null,
  });
}

/**
 * Sintesi clima azienda/ruolo + fonti, con Google Search grounding.
 */
export async function fetchCompanyIntelFromWeb(input: {
  companyName: string;
  roleTitle: string;
  location?: string | null;
  /** Testo già prodotto in generazione candidatura: evita Google Search. */
  existingContext?: string | null;
  /** Se true, usa Google Search anche se c'è già contesto. */
  forceWeb?: boolean;
}): Promise<CompanyIntelPayload> {
  if (isAiMockEnabled()) {
    await new Promise((r) => setTimeout(r, 400));
    return mockIntel(input.companyName, input.roleTitle);
  }

  const ai = getClient();
  const hasContext = Boolean(input.existingContext?.trim()) && !input.forceWeb;
  const systemInstruction = hasContext
    ? `Sei un coach colloquio onesto per candidati in Italia/EU.
Hai già il pacchetto candidatura (ricerca azienda, skill, gap, lettera).
REGOLE:
1. NON inventare recensioni, numeri o fonti web.
2. Usa SOLO il contesto fornito; se manca un dato → insufficiente / confidence bassa.
3. sources: solo URL già presenti nel contesto, altrimenti label senza url.
4. salary_hint solo se il contesto cita un range; altrimenti null.
5. Rispondi SOLO JSON conforme allo schema. Italiano.`
    : `Sei un ricercatore onesto per candidati lavoro in Italia/EU.
Usa la ricerca web (Glassdoor, Levels.fyi, TeamBlind, LinkedIn, blog, rassegna stampa).
REGOLE:
1. NON inventare recensioni o citazioni.
2. Sintetizza temi ricorrenti; se fonti scarse → overall_signal "insufficiente", confidence "bassa".
3. sources: preferisci URL reali trovati; altrimenti label + url null.
4. salary_hint solo se trovi range pubblici; sono stime, non certe.
5. Rispondi SOLO JSON conforme allo schema.
6. Scrivi in italiano.`;

  const contents = hasContext
    ? `Prepara un brief colloquio da questo materiale già generato (nessuna ricerca web).
Azienda: ${input.companyName}
Ruolo: ${input.roleTitle}
Luogo: ${input.location ?? "non indicato"}

--- CONTESTO CANDIDATURA ---
${input.existingContext!.trim().slice(0, 12000)}
---`
    : `Prepara un brief per il colloquio.
Azienda: ${input.companyName}
Ruolo: ${input.roleTitle}
Luogo: ${input.location ?? "non indicato"}

Cerca opinioni di dipendenti/ex, cultura, ritmi, pro/contro e consigli per il colloquio.
Includi link alle fonti quando disponibili.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: hasContext
        ? {
            systemInstruction,
            temperature: 0.25,
            responseMimeType: "application/json",
            responseJsonSchema: companyIntelJsonSchema as Record<
              string,
              unknown
            >,
          }
        : {
            systemInstruction,
            temperature: 0.3,
            tools: [{ googleSearch: {} }],
          },
    });

    const text = response.text ?? "";
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = tryParseJsonObject(text);
    }

    // Retry JSON-only se grounding non ha restituito JSON. Evita una seconda Search.
    if (!payload && !hasContext) {
      const retry = await ai.models.generateContent({
        model: MODEL,
        contents: `${contents}

NOTE DI RICERCA:
${text.slice(0, 6000)}

Restituisci SOLO JSON conforme allo schema.`,
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseJsonSchema: companyIntelJsonSchema as Record<string, unknown>,
        },
      });
      try {
        payload = JSON.parse(retry.text ?? "");
      } catch {
        payload = tryParseJsonObject(retry.text ?? "");
      }
    }

    const parsed = companyIntelPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return sanitizePayload({
        overall_signal: "insufficiente",
        one_liner:
          "Poche fonti pubbliche attendibili trovate per questa azienda/ruolo.",
        pros: [],
        cons: [],
        interview_tips: [
          "Prepara domande su stack, team e aspettative del ruolo",
          "Verifica RAL e benefit direttamente in colloquio",
        ],
        sources: [],
        confidence: "bassa",
        salary_hint: null,
      });
    }
    return sanitizePayload(parsed.data);
  } catch (err) {
    throw new Error(toUserFacingError(err, DISCOVERY_ERROR_FALLBACK));
  }
}
