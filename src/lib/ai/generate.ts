import { GoogleGenAI } from "@google/genai";

import { isAiMockEnabled, mockGenerateApplicationPackage } from "@/lib/ai/mock";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import {
  applicationPackageJsonSchema,
  applicationPackageSchema,
  type ApplicationPackage,
} from "@/lib/ai/schema";
import {
  GENERATION_ERROR_FALLBACK,
  isQuotaError,
  toUserFacingError,
} from "@/lib/ai/user-facing-error";
import { normalizeCvPackage } from "@/lib/cv/normalize-cv-package";
import { enforcePackageHonesty } from "@/lib/ai/enforce-honesty";
import { applyPreferenceFilter } from "@/lib/application/preference";
import type { CvSourceKind } from "@/lib/cv/resolve-source";
import type { JobPreference } from "@/lib/types/database";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

type GenerateInput = {
  offerInput: string;
  profile: {
    full_name: string | null;
    skills: string[];
    cv_fallback_text: string | null;
    job_preference: JobPreference;
    companies_of_interest: string[];
  };
  cvSourceKind?: CvSourceKind;
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

function finalizePackage(
  pkg: ApplicationPackage,
  profile: GenerateInput["profile"],
): ApplicationPackage {
  return applyPreferenceFilter(
    enforcePackageHonesty(normalizeCvPackage(pkg), profile),
    profile.job_preference,
  );
}

function parsePackage(text: string): ApplicationPackage {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(
      "Gemini non ha restituito un pacchetto strutturato. Riprova.",
    );
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

  const parsed = applicationPackageSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      `Output AI non valido: ${parsed.error.issues
        .slice(0, 3)
        .map((i) => i.message)
        .join("; ")}`,
    );
  }

  return parsed.data;
}

export async function generateApplicationPackage(
  input: GenerateInput,
): Promise<ApplicationPackage> {
  if (isAiMockEnabled()) {
    const mocked = await mockGenerateApplicationPackage(input.offerInput);
    return finalizePackage(mocked, input.profile);
  }

  const ai = getClient();
  const systemInstruction = buildSystemPrompt(input.profile, {
    cvSourceKind: input.cvSourceKind,
  });
  const schema = applicationPackageJsonSchema as Record<string, unknown>;
  const contents = buildUserPrompt(input.offerInput);

  try {
    // Mai combinare googleSearch + responseMimeType application/json
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.4,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
      },
    });
    const pkg = parsePackage(response.text ?? "");
    return finalizePackage(pkg, input.profile);
  } catch (err) {
    if (isQuotaError(err)) {
      throw new Error(toUserFacingError(err, GENERATION_ERROR_FALLBACK));
    }
    // Retry senza schema stretto
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: `${contents}\n\nRispondi SOLO con JSON valido del pacchetto candidatura.`,
        config: {
          systemInstruction,
          temperature: 0.35,
          responseMimeType: "application/json",
        },
      });
      const pkg = parsePackage(response.text ?? "");
      return finalizePackage(pkg, input.profile);
    } catch {
      throw new Error(toUserFacingError(err, GENERATION_ERROR_FALLBACK));
    }
  }
}
