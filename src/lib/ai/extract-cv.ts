import { GoogleGenAI } from "@google/genai";
import mammoth from "mammoth";

import {
  cvExtractJsonSchema,
  cvExtractSchema,
  type CvExtract,
} from "@/lib/ai/cv-extract-schema";
import { isAiMockEnabled } from "@/lib/ai/mock";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const MAX_BYTES = 10 * 1024 * 1024;

const PDF_TYPES = new Set(["application/pdf"]);
const DOCX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const DOC_TYPES = new Set(["application/msword"]);
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

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

function parseExtract(text: string): CvExtract {
  let payload: unknown;
  try {
    payload = JSON.parse(text.trim());
  } catch {
    payload = tryParseJsonObject(text);
  }
  if (!payload) {
    throw new Error("L'AI non ha restituito un JSON valido. Riprova.");
  }
  const parsed = cvExtractSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      `Estrazione non valida: ${parsed.error.issues
        .slice(0, 3)
        .map((i) => i.message)
        .join("; ")}`,
    );
  }
  return parsed.data;
}

const SYSTEM = `Sei un assistente che estrae dati da un curriculum vitae.
Regole:
- Usa SOLO informazioni presenti nel documento. Non inventare competenze, aziende o titoli.
- Se un campo non è chiaro, usa null o array vuoto.
- cv_fallback_text deve essere una trascrizione/sintesi fedele e leggibile del CV.
- skills: elenca solo skill esplicite (tecnologie, lingue, tool).
- companies_of_interest: solo aziende già presenti come esperienze lavorative nel CV.
- Rispondi solo con JSON conforme allo schema.`;

async function mockExtract(fileName: string): Promise<CvExtract> {
  await new Promise((r) => setTimeout(r, 400));
  return {
    full_name: "Mario Rossi",
    skills: ["React", "TypeScript", "Figma"],
    cv_fallback_text: `Curriculum (mock da ${fileName})\n\nMario Rossi — Frontend Developer\nEsperienza: 3 anni React/TypeScript.\nFormazione: Laurea in Informatica.`,
    companies_of_interest: ["Acme Spa"],
    job_preference: "lavoro",
    notes: "Risposta MOCK (USE_AI_MOCK=true).",
  };
}

export type ExtractCvInput = {
  bytes: Buffer;
  mimeType: string;
  fileName: string;
};

export async function extractCvFromDocument(
  input: ExtractCvInput,
): Promise<CvExtract> {
  const { bytes, mimeType, fileName } = input;

  if (bytes.byteLength === 0) {
    throw new Error("File vuoto.");
  }
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error("File troppo grande (max 10 MB).");
  }

  if (DOC_TYPES.has(mimeType) || fileName.toLowerCase().endsWith(".doc")) {
    throw new Error(
      "Il formato .doc (Word vecchio) non è supportato. Esporta in PDF o DOCX e riprova.",
    );
  }

  if (isAiMockEnabled()) {
    return mockExtract(fileName);
  }

  const lower = fileName.toLowerCase();
  const isPdf =
    PDF_TYPES.has(mimeType) || lower.endsWith(".pdf");
  const isDocx =
    DOCX_TYPES.has(mimeType) || lower.endsWith(".docx");
  const isImage =
    IMAGE_TYPES.has(mimeType) ||
    /\.(jpe?g|png|webp|gif)$/i.test(fileName);

  if (!isPdf && !isDocx && !isImage) {
    throw new Error(
      "Formato non supportato. Carica PDF, DOCX o un'immagine del CV.",
    );
  }

  const ai = getClient();
  const schema = cvExtractJsonSchema as unknown as Record<string, unknown>;

  if (isDocx) {
    const { value: text } = await mammoth.extractRawText({ buffer: bytes });
    const cleaned = text.replace(/\s+\n/g, "\n").trim();
    if (cleaned.length < 40) {
      throw new Error(
        "Non sono riuscito a leggere testo utile dal DOCX. Prova con un PDF.",
      );
    }
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Analizza questo testo estratto da un CV (.docx) e compila lo schema JSON.\n\n---\n${cleaned.slice(0, 60000)}`,
      config: {
        systemInstruction: SYSTEM,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
      },
    });
    return parseExtract(response.text ?? "");
  }

  const mime = isPdf
    ? "application/pdf"
    : IMAGE_TYPES.has(mimeType)
      ? mimeType
      : lower.endsWith(".png")
        ? "image/png"
        : lower.endsWith(".webp")
          ? "image/webp"
          : "image/jpeg";

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Analizza questo curriculum (OCR/lettura documento) e compila lo schema JSON. Non inventare.",
          },
          {
            inlineData: {
              mimeType: mime,
              data: bytes.toString("base64"),
            },
          },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM,
      temperature: 0.2,
      responseMimeType: "application/json",
      responseJsonSchema: schema,
    },
  });

  return parseExtract(response.text ?? "");
}
