/**
 * Risolve il materiale CV da usare per la generazione.
 *
 * Fonte unica multi-tenant: testo profilo / competenze.
 * I link Figma restano nel profilo solo per «Apri in Figma» (copia/incolla lato client).
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
