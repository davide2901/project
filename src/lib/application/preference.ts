import type { ApplicationPackage } from "@/lib/ai/schema";
import type { JobPreference } from "@/lib/types/database";

/**
 * Filtro preferenza Lavoro / Stage / Entrambi.
 * Usato sia in prompt sia in post-check sul pacchetto generato.
 */
export function preferenceAllowsPosition(
  preference: JobPreference,
  positionType: ApplicationPackage["position_type"],
): boolean {
  if (preference === "entrambi") return true;
  if (positionType === "non_chiaro") return true;
  return preference === positionType;
}

/**
 * Annota il pacchetto se l'offerta non rispetta la preferenza utente.
 * Non inventa competenze: aggiunge solo honesty_notes / omitted segnalazioni.
 */
export function applyPreferenceFilter(
  pkg: ApplicationPackage,
  preference: JobPreference,
): ApplicationPackage {
  if (preferenceAllowsPosition(preference, pkg.position_type)) {
    return pkg;
  }

  const note =
    preference === "lavoro"
      ? "Preferenza utente = solo lavoro: l'offerta risulta stage/tirocinio/internship. Non forzare un match."
      : "Preferenza utente = solo stage: l'offerta risulta lavoro. Non forzare un match.";

  return {
    ...pkg,
    honesty_notes: [...pkg.honesty_notes, note],
    omitted_offer_requirements: [
      ...pkg.omitted_offer_requirements,
      `Mismatch preferenza (${preference}) vs position_type (${pkg.position_type})`,
    ],
  };
}
