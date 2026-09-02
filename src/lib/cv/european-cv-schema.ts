import { z } from "zod";

export const cvWorkEntrySchema = z.object({
  period: z.string().describe("Es. 01/2024 – oggi o 09/2020 – 06/2023"),
  role: z.string(),
  employer: z.string(),
  location: z.string().nullable().optional(),
  highlights: z
    .array(z.string())
    .max(4)
    .describe("Max 4 bullet per esperienza, solo fatti dal CV originale"),
});

export const cvEducationEntrySchema = z.object({
  period: z.string(),
  qualification: z.string(),
  institution: z.string(),
  location: z.string().nullable().optional(),
});

export const cvLanguageSchema = z.object({
  language: z.string(),
  level: z.string().describe("Es. Madrelingua, B2, C1"),
});

export const europeanCvSchema = z.object({
  full_name: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  work_experience: z.array(cvWorkEntrySchema),
  education: z.array(cvEducationEntrySchema),
  skills: z.array(z.string()),
  languages: z.array(cvLanguageSchema).default([]),
  additional: z.array(z.string()).default([]),
});

export type EuropeanCv = z.infer<typeof europeanCvSchema>;
export type CvWorkEntry = z.infer<typeof cvWorkEntrySchema>;
export type CvEducationEntry = z.infer<typeof cvEducationEntrySchema>;

export const europeanCvJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "full_name",
    "work_experience",
    "education",
    "skills",
    "languages",
    "additional",
  ],
  properties: {
    full_name: { type: "string" },
    email: { type: ["string", "null"] },
    phone: { type: ["string", "null"] },
    location: { type: ["string", "null"] },
    summary: { type: ["string", "null"] },
    work_experience: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["period", "role", "employer", "highlights"],
        properties: {
          period: { type: "string" },
          role: { type: "string" },
          employer: { type: "string" },
          location: { type: ["string", "null"] },
          highlights: {
            type: "array",
            items: { type: "string" },
            maxItems: 4,
          },
        },
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["period", "qualification", "institution"],
        properties: {
          period: { type: "string" },
          qualification: { type: "string" },
          institution: { type: "string" },
          location: { type: ["string", "null"] },
        },
      },
    },
    skills: { type: "array", items: { type: "string" } },
    languages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["language", "level"],
        properties: {
          language: { type: "string" },
          level: { type: "string" },
        },
      },
    },
    additional: { type: "array", items: { type: "string" } },
  },
} as const;
