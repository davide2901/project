import { z } from "zod";

export const companyIntelSourceSchema = z.object({
  label: z.string(),
  url: z.string().nullable(),
});

export const companyIntelPayloadSchema = z.object({
  overall_signal: z.enum(["positivo", "misto", "critico", "insufficiente"]),
  one_liner: z
    .string()
    .describe("Una frase sul clima / realtà aziendale per questo ruolo"),
  pros: z.array(z.string()).max(4),
  cons: z.array(z.string()).max(4),
  interview_tips: z
    .array(z.string())
    .max(5)
    .describe("Come arrivare preparati al colloquio"),
  sources: z.array(companyIntelSourceSchema).max(8),
  confidence: z.enum(["alta", "media", "bassa"]),
  salary_hint: z
    .object({
      min: z.number().int().nullable(),
      max: z.number().int().nullable(),
      note: z.string().nullable(),
    })
    .nullable()
    .describe("Indicazione RAL da fonti pubbliche se trovata"),
});

export type CompanyIntelPayload = z.infer<typeof companyIntelPayloadSchema>;
export type CompanyIntelSource = z.infer<typeof companyIntelSourceSchema>;

export const companyIntelJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "overall_signal",
    "one_liner",
    "pros",
    "cons",
    "interview_tips",
    "sources",
    "confidence",
    "salary_hint",
  ],
  properties: {
    overall_signal: {
      type: "string",
      enum: ["positivo", "misto", "critico", "insufficiente"],
    },
    one_liner: { type: "string" },
    pros: { type: "array", items: { type: "string" }, maxItems: 4 },
    cons: { type: "array", items: { type: "string" }, maxItems: 4 },
    interview_tips: { type: "array", items: { type: "string" }, maxItems: 5 },
    sources: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "url"],
        properties: {
          label: { type: "string" },
          url: { type: ["string", "null"] },
        },
      },
    },
    confidence: { type: "string", enum: ["alta", "media", "bassa"] },
    salary_hint: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["min", "max", "note"],
      properties: {
        min: { type: ["integer", "null"] },
        max: { type: ["integer", "null"] },
        note: { type: ["string", "null"] },
      },
    },
  },
} as const;
