/**
 * Integrazione Google Gemini — generazione candidature + discovery + CV.
 *
 * - prompts.ts / schema.ts / generate.ts → pacchetto candidatura
 * - discovery-prompts.ts / discovery-schema.ts / discover.ts → offerte web
 * - extract-cv.ts / cv-extract-schema.ts → OCR/estrazione profilo da PDF/DOCX
 */

export { discoverOffersForProfile } from "@/lib/ai/discover";
export { extractCvFromDocument } from "@/lib/ai/extract-cv";
export { generateApplicationPackage } from "@/lib/ai/generate";
export {
  applicationPackageSchema,
  applicationPackageJsonSchema,
  type ApplicationPackage,
} from "@/lib/ai/schema";
export {
  discoveryResultSchema,
  type DiscoveryResult,
  type DiscoveredOfferItem,
} from "@/lib/ai/discovery-schema";
export {
  cvExtractSchema,
  type CvExtract,
} from "@/lib/ai/cv-extract-schema";