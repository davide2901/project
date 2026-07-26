/**
 * Risolve il materiale CV da usare per la generazione.
 *
 * Ordine:
 * 1) Se presente figma_cv_url → prova lettura Figma (sola lettura sull'originale)
 * 2) In caso di QUALSIASI errore Figma → fallback su cv_fallback_text del profilo
 * 3) Se manca anche il fallback → errore
 */

import { extractTextFromFigmaFile } from "@/lib/figma/safe-edit";
import type { JobPreference } from "@/lib/types/database";

export type CvSourceKind = "figma" | "fallback";

export type ResolvedCvSource = {
  kind: CvSourceKind;
  text: string;
  /** Valorizzato solo se Figma è fallito e si è usato il fallback. */
  figmaError?: string;
};

type ProfileForCv = {
  figma_cv_url: string | null;
  cv_fallback_text: string | null;
  skills: string[];
  job_preference: JobPreference;
};

export async function resolveCvSource(
  profile: ProfileForCv,
): Promise<ResolvedCvSource> {
  const fallback = profile.cv_fallback_text?.trim() ?? "";
  const figmaUrl = profile.figma_cv_url?.trim() ?? "";

  if (figmaUrl) {
    try {
      const text = await extractTextFromFigmaFile(figmaUrl);
      return { kind: "figma", text };
    } catch (err) {
      const figmaError =
        err instanceof Error ? err.message : "Errore sconosciuto Figma";

      if (fallback) {
        return {
          kind: "fallback",
          text: fallback,
          figmaError,
        };
      }

      // Nessun CV testuale: rilancia (il chiamante può ancora usare solo skills)
      throw new Error(
        `Figma non raggiungibile e CV di fallback assente: ${figmaError}`,
      );
    }
  }

  if (fallback) {
    return { kind: "fallback", text: fallback };
  }

  if (profile.skills.length > 0) {
    return {
      kind: "fallback",
      text: `(CV non fornito — competenze dichiarate: ${profile.skills.join(", ")})`,
    };
  }

  throw new Error(
    "Nessuna fonte CV: configura figma_cv_url oppure cv_fallback_text nel Profilo.",
  );
}
