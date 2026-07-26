import { z } from "zod";

export const cvExtractSchema = z.object({
  full_name: z.string().nullable(),
  skills: z.array(z.string()).default([]),
  cv_fallback_text: z.string().min(1),
  companies_of_interest: z.array(z.string()).default([]),
  job_preference: z.enum(["lavoro", "stage", "entrambi"]).nullable(),
  notes: z.string().nullable().optional(),
});

export type CvExtract = z.infer<typeof cvExtractSchema>;

/** JSON Schema per Gemini responseJsonSchema */
export const cvExtractJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "full_name",
    "skills",
    "cv_fallback_text",
    "companies_of_interest",
    "job_preference",
  ],
  properties: {
    full_name: {
      type: ["string", "null"],
      description: "Nome e cognome del candidato se presenti nel CV",
    },
    skills: {
      type: "array",
      items: { type: "string" },
      description:
        "Competenze tecniche e soft skills esplicitamente presenti nel CV",
    },
    cv_fallback_text: {
      type: "string",
      description:
        "Trascrizione/sintesi strutturata del CV in testo plain (sezioni: esperienza, formazione, skills). Non inventare.",
    },
    companies_of_interest: {
      type: "array",
      items: { type: "string" },
      description:
        "Aziende già citate nel CV (esperienze passate). Non inventare target futuri.",
    },
    job_preference: {
      type: ["string", "null"],
      enum: ["lavoro", "stage", "entrambi", null],
      description:
        "Inferisci solo se chiaro dal CV (es. tirocinio vs posizione junior). Altrimenti null.",
    },
    notes: {
      type: ["string", "null"],
      description: "Avvertenze su parti illeggibili o ambigue",
    },
  },
} as const;
