import type { JobPreference } from "@/lib/types/database";

type DiscoveryProfile = {
  full_name: string | null;
  skills: string[];
  cv_fallback_text: string | null;
  job_preference: JobPreference;
  companies_of_interest: string[];
};

export function buildDiscoverySystemPrompt(profile: DiscoveryProfile): string {
  const preferenceHint =
    profile.job_preference === "lavoro"
      ? "Cerca SOLO posizioni di lavoro (no stage/tirocinio/internship)."
      : profile.job_preference === "stage"
        ? "Cerca SOLO stage, tirocinio o internship."
        : "Puoi includere sia lavoro sia stage/tirocinio/internship.";

  return `Sei un assistente di job discovery per candidature oneste.

REGOLE:
1. Usa Google Search per trovare offerte RECENTI allineate al profilo.
2. NON inventare URL: source_url solo se trovato nella ricerca; altrimenti null.
3. Non inventare competenze del candidato: match_reason deve basarsi solo su skills/CV forniti.
4. Massimo 8 offerte, preferibilmente 4–6 di buona qualità.
5. ${preferenceHint}
6. Se companies_of_interest è valorizzato, privilegia offerte di quelle aziende o simili.
7. Classifica position_type correttamente (lavoro | stage | non_chiaro).
8. Rispondi SOLO con JSON conforme allo schema.`;
}

export function buildDiscoveryUserPrompt(profile: DiscoveryProfile): string {
  const skills = profile.skills.length
    ? profile.skills.join(", ")
    : "(nessuna competenza elencata)";
  const companies = profile.companies_of_interest.length
    ? profile.companies_of_interest.join(", ")
    : "(nessuna preferenza azienda)";
  const cvExcerpt = (profile.cv_fallback_text ?? "").trim().slice(0, 2500);

  return `Cerca offerte di lavoro/stage adatte a questo profilo.

Nome: ${profile.full_name ?? "non indicato"}
Preferenza: ${profile.job_preference}
Competenze: ${skills}
Aziende di interesse: ${companies}
Estratto CV:
${cvExcerpt || "(CV non fornito)"}

Restituisci offers + search_notes.`;
}
