import { z } from "zod";

export const discoveredOfferItemSchema = z.object({
  company_name: z.string(),
  role_title: z.string(),
  position_type: z.enum(["lavoro", "stage", "non_chiaro"]),
  location: z.string().nullable(),
  source_url: z
    .string()
    .nullable()
    .describe("URL reale dall'offerta/ricerca, o null se non verificabile"),
  snippet: z.string().describe("Breve descrizione dell'offerta"),
  match_reason: z
    .string()
    .describe("Perché questa offerta è adatta al profilo del candidato"),
});

export const discoveryResultSchema = z.object({
  offers: z
    .array(discoveredOfferItemSchema)
    .max(12)
    .describe("Fino a 12 offerte allineate al profilo"),
  search_notes: z
    .array(z.string())
    .describe("Note su limiti della ricerca / fonti non trovate"),
});

export type DiscoveredOfferItem = z.infer<typeof discoveredOfferItemSchema>;
export type DiscoveryResult = z.infer<typeof discoveryResultSchema>;

export const discoveryResultJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["offers", "search_notes"],
  properties: {
    offers: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "company_name",
          "role_title",
          "position_type",
          "location",
          "source_url",
          "snippet",
          "match_reason",
        ],
        properties: {
          company_name: { type: "string" },
          role_title: { type: "string" },
          position_type: {
            type: "string",
            enum: ["lavoro", "stage", "non_chiaro"],
          },
          location: { type: ["string", "null"] },
          source_url: { type: ["string", "null"] },
          snippet: { type: "string" },
          match_reason: { type: "string" },
        },
      },
    },
    search_notes: { type: "array", items: { type: "string" } },
  },
} as const;
