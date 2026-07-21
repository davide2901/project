/**
 * Integrazione Anthropic Claude — Fase 1.
 *
 * - prompts.ts  → system/user prompt (onestà, stage, fatti web)
 * - schema.ts   → Zod + JSON Schema del pacchetto candidatura
 * - generate.ts → chiamata Messages API + web_search + tool strutturato
 *
 * Se hai un prototipo HTML con prompt/schema diversi, allineiamo questi file.
 */

export { generateApplicationPackage } from "@/lib/ai/generate";
export {
  applicationPackageSchema,
  applicationPackageJsonSchema,
  type ApplicationPackage,
} from "@/lib/ai/schema";
