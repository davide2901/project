import { isDuplicateOffer } from "@/lib/discovery/dedupe";
import type { DiscoveredOfferItem } from "@/lib/ai/discovery-schema";
import type { JobPreference } from "@/lib/types/database";

export const DISCOVERY_OFFER_CAP = 12;

export type DiscoveryAngle = {
  id: string;
  label: string;
  focus: string;
};

type ProfileLike = {
  skills: string[];
  job_preference: JobPreference;
  companies_of_interest: string[];
};

/** 2–3 angoli di ricerca distinti (skills / tipo / aziende). */
export function buildDiscoveryAngles(profile: ProfileLike): DiscoveryAngle[] {
  const skills =
    profile.skills.slice(0, 8).join(", ") || "competenze del profilo";
  const companies = profile.companies_of_interest.slice(0, 5);
  const angles: DiscoveryAngle[] = [];

  if (profile.job_preference === "stage") {
    angles.push({
      id: "stage",
      label: "stage/tirocinio",
      focus: `stage, tirocinio o internship in Italia (o remote IT) per: ${skills}`,
    });
  } else if (profile.job_preference === "lavoro") {
    angles.push({
      id: "lavoro",
      label: "lavoro",
      focus: `posizioni di lavoro (no stage) in Italia (o remote IT) per: ${skills}`,
    });
  } else {
    angles.push({
      id: "lavoro",
      label: "lavoro",
      focus: `posizioni di lavoro in Italia (o remote IT) per: ${skills}`,
    });
    angles.push({
      id: "stage",
      label: "stage",
      focus: `stage/tirocinio/internship in Italia (o remote IT) per: ${skills}`,
    });
  }

  if (companies.length > 0) {
    angles.push({
      id: "aziende",
      label: "aziende di interesse",
      focus: `offerte aperte presso o simili a: ${companies.join(", ")} (profilo: ${skills})`,
    });
  } else if (angles.length < 2) {
    angles.push({
      id: "ampliato",
      label: "ruoli correlati",
      focus: `ruoli correlati / junior / mid in Italia per: ${skills}`,
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
