import { isDuplicateOffer } from "@/lib/discovery/dedupe";
import type { DiscoveredOfferItem } from "@/lib/ai/discovery-schema";
import type { JobPreference } from "@/lib/types/database";

export const DISCOVERY_OFFER_CAP = 12;

/** Soglia sotto la quale si lancia un secondo giro «alternative». */
export const DISCOVERY_REFRESH_MIN_NEW = 3;

export type DiscoveryAngle = {
  id: string;
  label: string;
  focus: string;
};

type ProfileLike = {
  skills: string[];
  job_preference: JobPreference;
  companies_of_interest: string[];
  preferred_locations?: string[];
};

function placesPhrase(locations: string[]): string {
  if (locations.length === 0) return "in Italia (o remote IT)";
  return `in/near: ${locations.slice(0, 6).join(", ")}`;
}

/** 2–3 angoli di ricerca distinti (skills / tipo / luoghi / aziende). */
export function buildDiscoveryAngles(
  profile: ProfileLike,
  opts: { refresh?: boolean } = {},
): DiscoveryAngle[] {
  const skills =
    profile.skills.slice(0, 8).join(", ") || "competenze del profilo";
  const companies = profile.companies_of_interest.slice(0, 5);
  const locations = (profile.preferred_locations ?? [])
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 6);
  const where = placesPhrase(locations);
  const refresh = Boolean(opts.refresh);

  if (refresh) {
    const geoFocus =
      locations.length > 0
        ? `altre offerte nelle zone preferite (${locations.join(", ")}) o remote IT per: ${skills}. Solo posizioni non già viste.`
        : `offerte in altre città italiane o remote per: ${skills}. Solo posizioni non già viste.`;
    return [
      {
        id: "alternative",
        label: "aziende alternative",
        focus: `offerte DIVERSE da quelle già viste: altre aziende ${where} per: ${skills}. Evita di ripetere ruoli già trovati.`,
      },
      {
        id: "geo",
        label: "luoghi / remote",
        focus: geoFocus,
      },
      {
        id: "ruoli",
        label: "ruoli contigui",
        focus: `ruoli contigui/adjacenti ${where} (non gli stessi titoli già visti) per: ${skills}`,
      },
    ].slice(0, 3);
  }

  const angles: DiscoveryAngle[] = [];

  if (profile.job_preference === "stage") {
    angles.push({
      id: "stage",
      label: "stage/tirocinio",
      focus: `stage, tirocinio o internship ${where} per: ${skills}`,
    });
  } else if (profile.job_preference === "lavoro") {
    angles.push({
      id: "lavoro",
      label: "lavoro",
      focus: `posizioni di lavoro (no stage) ${where} per: ${skills}`,
    });
  } else {
    angles.push({
      id: "lavoro",
      label: "lavoro",
      focus: `posizioni di lavoro ${where} per: ${skills}`,
    });
    angles.push({
      id: "stage",
      label: "stage",
      focus: `stage/tirocinio/internship ${where} per: ${skills}`,
    });
  }

  if (locations.length > 0 && angles.length < 3) {
    angles.push({
      id: "luoghi",
      label: "luoghi preferiti",
      focus: `offerte aperte ${where} allineate a: ${skills}`,
    });
  }

  if (companies.length > 0 && angles.length < 3) {
    angles.push({
      id: "aziende",
      label: "aziende di interesse",
      focus: `offerte aperte presso o simili a: ${companies.join(", ")} (${where}; profilo: ${skills})`,
    });
  } else if (angles.length < 2) {
    angles.push({
      id: "ampliato",
      label: "ruoli correlati",
      focus: `ruoli correlati / junior / mid ${where} per: ${skills}`,
    });
  }

  return angles.slice(0, 3);
}

export function mergeDiscoveryOffers(
  batches: DiscoveredOfferItem[][],
  cap = DISCOVERY_OFFER_CAP,
): DiscoveredOfferItem[] {
  const merged: DiscoveredOfferItem[] = [];
  for (const batch of batches) {
    for (const offer of batch) {
      if (isDuplicateOffer(offer, merged)) continue;
      merged.push(offer);
      if (merged.length >= cap) return merged;
    }
  }
  return merged;
}

/** Tiene solo offerte non già presenti nella history utente. */
export function filterNovelOffers(
  offers: DiscoveredOfferItem[],
  alreadySeen: {
    company_name: string;
    role_title: string;
    source_url?: string | null;
  }[],
): DiscoveredOfferItem[] {
  const seen = alreadySeen.map((o) => ({
    company_name: o.company_name,
    role_title: o.role_title,
    source_url: o.source_url ?? null,
  }));
  return offers.filter((o) => !isDuplicateOffer(o, seen));
}
