/**
 * Risolve il materiale CV da usare per la generazione.
 *
 * Fonte: testo profilo / competenze (anche dopo «Importa CV da Figma»).
 * I link Figma + OAuth servono all'import; l'export usa plugin + sync code.
 */

import type { JobPreference } from "@/lib/types/database";

export type CvSourceKind = "profile";

export type ResolvedCvSource = {
  kind: CvSourceKind;
  text: string;
};

type ProfileForCv = {
  cv_fallback_text: string | null;
  skills: string[];
  job_preference: JobPreference;
};

export async function resolveCvSource(
  profile: ProfileForCv,
): Promise<ResolvedCvSource> {
  const fallback = profile.cv_fallback_text?.trim() ?? "";

  if (fallback) {
    return { kind: "profile", text: fallback };
  }

  if (profile.skills.length > 0) {
    return {
      kind: "profile",
      text: `(CV non fornito — competenze dichiarate: ${profile.skills.join(", ")})`,
    };
  }

  throw new Error(
    "Nessuna fonte CV: configura il CV testuale oppure le competenze nel Profilo.",
  );
}
