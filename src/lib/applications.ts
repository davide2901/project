import { createHash } from "crypto";

import type { ApplicationPackage } from "@/lib/ai/schema";

/** Normalizza e hasha l'offerta per evitare candidature duplicate. */
export function offerFingerprint(offerInput: string): string {
  const normalized = offerInput.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized).digest("hex");
}

/** Dedup fatti azienda (stessa label+value da ricerche ripetute). */
export function dedupeCompanyFacts(
  facts: ApplicationPackage["company_research"]["facts"],
): ApplicationPackage["company_research"]["facts"] {
  const seen = new Set<string>();
  const out: ApplicationPackage["company_research"]["facts"] = [];
  for (const fact of facts) {
    const key = `${fact.label.trim().toLowerCase()}|${fact.value.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(fact);
  }
  return out;
}

export function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

export function sanitizeApplicationPackage(
  data: ApplicationPackage,
): ApplicationPackage {
  return {
    ...data,
    ats_keywords: dedupeStrings(data.ats_keywords),
    matched_skills: dedupeStrings(data.matched_skills),
    omitted_offer_requirements: dedupeStrings(data.omitted_offer_requirements),
    honesty_notes: dedupeStrings(data.honesty_notes),
    company_research: {
      ...data.company_research,
      facts: dedupeCompanyFacts(data.company_research.facts),
      unavailable_notes: dedupeStrings(data.company_research.unavailable_notes),
    },
  };
}
