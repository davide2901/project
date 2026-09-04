import type { JobPreference } from "@/lib/types/database";

type DiscoveryProfile = {
  full_name: string | null;
  skills: string[];
  cv_fallback_text: string | null;
  job_preference: JobPreference;
  companies_of_interest: string[];
  preferred_locations?: string[];
};

export type SeenOfferRef = {
  company_name: string;
  role_title: string;
};

function formatOfferLines(seen: SeenOfferRef[], limit = 40): string {
  const lines = seen
    .slice(0, limit)
    .map((o) => `- ${o.company_name} — ${o.role_title}`);
  const more =
    seen.length > limit ? `\n(+ altre ${seen.length - limit})` : "";
  return `${lines.join("\n")}${more}`;
}

function formatSeenOffers(seen: SeenOfferRef[], limit = 40): string {
  if (seen.length === 0) return "";
  return `OFFERTE GIÀ TROVATE (scartale: cerca ALTRE aziende e/o ruoli diversi):
${formatOfferLines(seen, limit)}`;
}

function formatDismissedOffers(dismissed: SeenOfferRef[], limit = 30): string {
  if (dismissed.length === 0) return "";
  return `OFFERTE SCARTATE DALL'UTENTE (non riproporle, né varianti minime):
${formatOfferLines(dismissed, limit)}`;
}

function formatWatchlist(watchlist: SeenOfferRef[], limit = 20): string {
  if (watchlist.length === 0) return "";
  return `LISTA DA TENERE D'OCCHIO (già salvate: non duplicarle. Cerca ruoli/aziende SIMILI o complementari, non le stesse coppie azienda+ruolo):
${formatOfferLines(watchlist, limit)}`;
}

function locationHint(locations: string[]): string {
  if (locations.length === 0) {
    return "Nessuna preferenza di luogo: Italia o remote IT va bene.";
  }
  return `Privilegia fortemente luoghi tra: ${locations.join(", ")}. Puoi includere remote/ibrido se elencati o se l'utente ha scritto «remoto»/«remote»/«ibrido». Evita altre città se non necessarie.`;
}

export function buildDiscoverySystemPrompt(profile: DiscoveryProfile): string {
  const preferenceHint =
    profile.job_preference === "lavoro"
      ? "Cerca SOLO posizioni di lavoro (no stage/tirocinio/internship)."
      : profile.job_preference === "stage"
        ? "Cerca SOLO stage, tirocinio o internship."
        : "Puoi includere sia lavoro sia stage/tirocinio/internship.";
  const locations = profile.preferred_locations ?? [];

  return `Sei un assistente di job discovery per candidature oneste.

REGOLE:
1. Se sotto trovi NOTE DALLA RICERCA WEB, usale come fonte primaria: non inventare offerte assenti da quelle note.
2. source_url: includi l'URL dell'annuncio o della pagina careers se lo trovi nella ricerca; NON inventare URL. Se non c'è un link verificabile, null.
3. RAL (salary_min/salary_max in euro interi, RAL annua lorda): se la cifra è NELL'ANNUNCIO → salary_source="annuncio". Se non c'è ma trovi range su Glassdoor/Levels.fyi/mercato → salary_source="stima" (sono indicative, non certe). Se non trovi nulla → salary_min=null, salary_max=null, salary_source=null. Non inventare cifre.
4. Non inventare competenze del candidato: match_reason deve basarsi solo su skills/CV forniti.
5. Massimo 12 offerte, preferibilmente 6–10 di buona qualità.
6. ${preferenceHint}
7. Se companies_of_interest è valorizzato, privilegia offerte di quelle aziende o simili — ma se quelle aziende sono già nella lista «già trovate», cerca altrove.
8. Luoghi preferiti: ${locationHint(locations)}
9. Classifica position_type correttamente (lavoro | stage | non_chiaro).
10. Se le note di ricerca sono vuote o deboli, restituisci poche offerte (anche zero) piuttosto che inventarle; spiega in search_notes.
11. Se c'è una lista OFFERTA GIÀ TROVATE / GIÀ VISTE: non ripeterle (né varianti minime dello stesso ruolo nella stessa azienda). Preferisci aziende e ruoli nuovi.
12. Se c'è LISTA DA TENERE D'OCCHIO: sono offerte salvate senza candidatura. Non duplicarle. Puoi usare quelle aziende come segnale di interesse per trovare ALTRE posizioni.
13. Se c'è OFFERTE SCARTATE: non riproporle.
14. Rispondi SOLO con JSON conforme allo schema.`;
}

export function buildDiscoveryUserPrompt(
  profile: DiscoveryProfile,
  seenOffers: SeenOfferRef[] = [],
  extras: { watchlist?: SeenOfferRef[]; dismissed?: SeenOfferRef[] } = {},
): string {
  const skills = profile.skills.length
    ? profile.skills.join(", ")
    : "(nessuna competenza elencata)";
  const watchCompanies = [
    ...profile.companies_of_interest,
    ...(extras.watchlist ?? []).map((o) => o.company_name),
  ]
    .map((c) => c.trim())
    .filter(Boolean);
  const companies = watchCompanies.length
    ? [...new Set(watchCompanies)].join(", ")
    : "(nessuna preferenza azienda)";
  const locations = (profile.preferred_locations ?? [])
    .map((l) => l.trim())
    .filter(Boolean);
  const places = locations.length
    ? locations.join(", ")
    : "(nessuna preferenza luogo)";
  const cvExcerpt = (profile.cv_fallback_text ?? "").trim().slice(0, 2500);
  const seenBlock = formatSeenOffers(seenOffers);
  const watchBlock = formatWatchlist(extras.watchlist ?? []);
  const dismissedBlock = formatDismissedOffers(extras.dismissed ?? []);

  return `Cerca offerte di lavoro/stage adatte a questo profilo.

Nome: ${profile.full_name ?? "non indicato"}
Preferenza: ${profile.job_preference}
Competenze: ${skills}
Luoghi preferiti: ${places}
Aziende di interesse: ${companies}
Estratto CV:
${cvExcerpt || "(CV non fornito)"}
${seenBlock ? `\n${seenBlock}\n` : ""}${watchBlock ? `\n${watchBlock}\n` : ""}${dismissedBlock ? `\n${dismissedBlock}\n` : ""}
Restituisci offers + search_notes.`;
}
