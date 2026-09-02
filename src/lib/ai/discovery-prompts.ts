import type { JobPreference } from "@/lib/types/database";

type DiscoveryProfile = {
  full_name: string | null;
  skills: string[];
  cv_fallback_text: string | null;
  job_preference: JobPreference;
  companies_of_interest: string[];
};

export type SeenOfferRef = {
  company_name: string;
  role_title: string;
};

function formatSeenOffers(seen: SeenOfferRef[], limit = 40): string {
  if (seen.length === 0) return "";
  const lines = seen
    .slice(0, limit)
    .map((o) => `- ${o.company_name} — ${o.role_title}`);
  const more =
    seen.length > limit ? `\n(+ altre ${seen.length - limit} già viste)` : "";
  return `OFFERTE GIÀ TROVATE (scartale: cerca ALTRE aziende e/o ruoli diversi):
${lines.join("\n")}${more}`;
}

export function buildDiscoverySystemPrompt(profile: DiscoveryProfile): string {
  const preferenceHint =
    profile.job_preference === "lavoro"
      ? "Cerca SOLO posizioni di lavoro (no stage/tirocinio/internship)."
      : profile.job_preference === "stage"
        ? "Cerca SOLO stage, tirocinio o internship."
        : "Puoi includere sia lavoro sia stage/tirocinio/internship.";

  return `Sei un assistente di job discovery per candidature oneste.

REGOLE:
1. Se sotto trovi NOTE DALLA RICERCA WEB, usale come fonte primaria: non inventare offerte assenti da quelle note.
2. source_url: includi l'URL dell'annuncio o della pagina careers se lo trovi nella ricerca; NON inventare URL. Se non c'è un link verificabile, null.
3. Non inventare competenze del candidato: match_reason deve basarsi solo su skills/CV forniti.
4. Massimo 12 offerte, preferibilmente 6–10 di buona qualità.
5. ${preferenceHint}
6. Se companies_of_interest è valorizzato, privilegia offerte di quelle aziende o simili — ma se quelle aziende sono già nella lista «già trovate», cerca altrove.
7. Classifica position_type correttamente (lavoro | stage | non_chiaro).
8. Se le note di ricerca sono vuote o deboli, restituisci poche offerte (anche zero) piuttosto che inventarle; spiega in search_notes.
9. Se c'è una lista OFFERTA GIÀ TROVATE / GIÀ VISTE: non ripeterle (né varianti minime dello stesso ruolo nella stessa azienda). Preferisci aziende e ruoli nuovi.
10. Rispondi SOLO con JSON conforme allo schema.`;
}

export function buildDiscoveryUserPrompt(
  profile: DiscoveryProfile,
  seenOffers: SeenOfferRef[] = [],
): string {
  const skills = profile.skills.length
    ? profile.skills.join(", ")
    : "(nessuna competenza elencata)";
  const companies = profile.companies_of_interest.length
    ? profile.companies_of_interest.join(", ")
    : "(nessuna preferenza azienda)";
  const cvExcerpt = (profile.cv_fallback_text ?? "").trim().slice(0, 2500);
  const seenBlock = formatSeenOffers(seenOffers);

  return `Cerca offerte di lavoro/stage adatte a questo profilo.

Nome: ${profile.full_name ?? "non indicato"}
Preferenza: ${profile.job_preference}
Competenze: ${skills}
Aziende di interesse: ${companies}
Estratto CV:
${cvExcerpt || "(CV non fornito)"}
${seenBlock ? `\n${seenBlock}\n` : ""}
Restituisci offers + search_notes.`;
}
