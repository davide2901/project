import { z } from "zod";

/**
 * Schema JSON di output per la generazione candidatura (Fase 1).
 * Derivato dai requisiti del progetto; allineabile al prototipo HTML
 * quando disponibile.
 */
export const companyFactSchema = z.object({
  label: z.string().describe("Etichetta del fatto (es. Settore, Sede)"),
  value: z
    .string()
    .describe(
      'Valore verificato, oppure esattamente "non reperibile" se non trovato',
    ),
  source: z
    .string()
    .nullable()
    .describe("URL o nome fonte, null se non reperibile"),
});

export const applicationPackageSchema = z.object({
  company_name: z.string(),
  role_title: z.string(),
  position_type: z.enum(["lavoro", "stage", "non_chiaro"]),
  ats_keywords: z
    .array(z.string())
    .describe("Keyword rilevanti estratte dall'offerta per ATS"),
  matched_skills: z
    .array(z.string())
    .describe("Solo competenze già presenti nel CV/profilo del candidato"),
  omitted_offer_requirements: z
    .array(z.string())
    .describe(
      "Requisiti dell'offerta NON coperti dal CV (non inventare competenze)",
    ),
  company_research: z.object({
    summary: z.string(),
    facts: z.array(companyFactSchema),
    unavailable_notes: z
      .array(z.string())
      .describe("Cosa non è stato possibile verificare"),
  }),
  optimized_cv_text: z
    .string()
    .describe(
      "CV riformulato/riordinato; nessuna competenza inventata",
    ),
  cover_letter: z.string(),
  email_draft: z.object({
    subject: z.string(),
    body: z.string(),
  }),
  honesty_notes: z
    .array(z.string())
    .describe("Dichiarazioni trasparenti su limiti/incertezze"),
});

export type ApplicationPackage = z.infer<typeof applicationPackageSchema>;

/** Schema JSON Schema (draft) per tool Anthropic / documentazione. */
export const applicationPackageJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "company_name",
    "role_title",
    "position_type",
    "ats_keywords",
    "matched_skills",
    "omitted_offer_requirements",
    "company_research",
    "optimized_cv_text",
    "cover_letter",
    "email_draft",
    "honesty_notes",
  ],
  properties: {
    company_name: { type: "string" },
    role_title: { type: "string" },
    position_type: {
      type: "string",
      enum: ["lavoro", "stage", "non_chiaro"],
    },
    ats_keywords: { type: "array", items: { type: "string" } },
    matched_skills: { type: "array", items: { type: "string" } },
    omitted_offer_requirements: { type: "array", items: { type: "string" } },
    company_research: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "facts", "unavailable_notes"],
      properties: {
        summary: { type: "string" },
        facts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "value", "source"],
            properties: {
              label: { type: "string" },
              value: { type: "string" },
              source: { type: ["string", "null"] },
            },
          },
        },
        unavailable_notes: { type: "array", items: { type: "string" } },
      },
    },
    optimized_cv_text: { type: "string" },
    cover_letter: { type: "string" },
    email_draft: {
      type: "object",
      additionalProperties: false,
      required: ["subject", "body"],
      properties: {
        subject: { type: "string" },
        body: { type: "string" },
      },
    },
    honesty_notes: { type: "array", items: { type: "string" } },
  },
} as const;
