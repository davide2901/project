import type { DiscoveredOffer } from "@/lib/types/database";

export type OfferSort =
  | "recent"
  | "popular"
  | "affinity_desc"
  | "affinity_asc"
  | "ral_desc"
  | "ral_asc";

export type OfferTypeFilter = "all" | "lavoro" | "stage" | "non_chiaro";

export type OfferWorkModeFilter = "all" | "remote" | "hybrid" | "onsite";

export type OfferSalaryFilter =
  | "all"
  | "known"
  | "annuncio"
  | "missing"
  | "with_link";

export type OfferListFilters = {
  sort: OfferSort;
  type: OfferTypeFilter;
  workMode: OfferWorkModeFilter;
  salary: OfferSalaryFilter;
};

export const DEFAULT_OFFER_FILTERS: OfferListFilters = {
  sort: "recent",
  type: "all",
  workMode: "all",
  salary: "all",
};

export function offerFiltersActive(filters: OfferListFilters): boolean {
  return (
    filters.sort !== "recent" ||
    filters.type !== "all" ||
    filters.workMode !== "all" ||
    filters.salary !== "all"
  );
}

export function ralMidpoint(offer: Pick<DiscoveredOffer, "salary_min" | "salary_max">): number | null {
  const min = offer.salary_min;
  const max = offer.salary_max;
  if (min == null && max == null) return null;
  if (min != null && max != null) return (min + max) / 2;
  return min ?? max ?? null;
}

const POPULAR_BOARDS =
  /linkedin|indeed|glassdoor|infojobs|monster|jooble|subito|talent\.com|welcometothejungle|jobleads|astrojobs|hiring\.cafe|remoteok|weworkremotely/i;

export function popularityScore(
  offer: Pick<
    DiscoveredOffer,
    "source_url" | "salary_source" | "salary_min" | "snippet" | "match_reason"
  >,
): number {
  let score = 0;
  const url = offer.source_url?.trim() ?? "";
  if (url) score += 2;
  if (url && POPULAR_BOARDS.test(url)) score += 4;
  if (offer.salary_source === "annuncio") score += 3;
  else if (offer.salary_min != null) score += 1;
  if ((offer.snippet ?? "").length > 120) score += 1;
  if ((offer.match_reason ?? "").length > 80) score += 1;
  return score;
}

export function affinityScore(
  offer: Pick<
    DiscoveredOffer,
    "match_reason" | "snippet" | "role_title" | "company_name"
  >,
  skills: string[],
  companiesOfInterest: string[] = [],
): number {
  const hay = `${offer.match_reason}\n${offer.snippet}\n${offer.role_title}`.toLowerCase();
  let score = Math.min(10, Math.round((offer.match_reason ?? "").length / 35));

  for (const skill of skills) {
    const token = skill.trim().toLowerCase();
    if (token.length >= 2 && hay.includes(token)) score += 3;
  }

  const company = offer.company_name.trim().toLowerCase();
  for (const name of companiesOfInterest) {
    const token = name.trim().toLowerCase();
    if (token.length >= 2 && company.includes(token)) score += 4;
  }

  return score;
}

export type OfferWorkMode = "remote" | "hybrid" | "onsite" | "unknown";

export function inferWorkMode(
  location: string | null | undefined,
): OfferWorkMode {
  const loc = (location ?? "").toLowerCase();
  if (!loc.trim()) return "unknown";
  if (
    /hybrid|ibrido|hybrid\s*\/|misto|part.?remote/.test(loc)
  ) {
    return "hybrid";
  }
  if (
    /remote|da remoto|full.?remote|smart working|telelavoro|100%\s*remoto/.test(
      loc,
    )
  ) {
    return "remote";
  }
  return "onsite";
}

function matchesSalaryFilter(
  offer: DiscoveredOffer,
  filter: OfferSalaryFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "with_link") return Boolean(offer.source_url?.trim());
  const known = ralMidpoint(offer) != null;
  if (filter === "known") return known;
  if (filter === "missing") return !known;
  return offer.salary_source === "annuncio" && known;
}

export function filterAndSortOffers(
  offers: DiscoveredOffer[],
  filters: OfferListFilters,
  profile: { skills: string[]; companiesOfInterest: string[] } = {
    skills: [],
    companiesOfInterest: [],
  },
): DiscoveredOffer[] {
  const filtered = offers.filter((offer) => {
    if (filters.type !== "all" && offer.position_type !== filters.type) {
      return false;
    }
    if (filters.workMode !== "all") {
      if (inferWorkMode(offer.location) !== filters.workMode) return false;
    }
    if (!matchesSalaryFilter(offer, filters.salary)) return false;
    return true;
  });

  const dated = (o: DiscoveredOffer) => new Date(o.created_at).getTime();

  return [...filtered].sort((a, b) => {
    switch (filters.sort) {
      case "popular":
        return popularityScore(b) - popularityScore(a) || dated(b) - dated(a);
      case "affinity_desc":
        return (
          affinityScore(b, profile.skills, profile.companiesOfInterest) -
            affinityScore(a, profile.skills, profile.companiesOfInterest) ||
          dated(b) - dated(a)
        );
      case "affinity_asc":
        return (
          affinityScore(a, profile.skills, profile.companiesOfInterest) -
            affinityScore(b, profile.skills, profile.companiesOfInterest) ||
          dated(b) - dated(a)
        );
      case "ral_desc":
      case "ral_asc": {
        const ra = ralMidpoint(a);
        const rb = ralMidpoint(b);
        if (ra == null && rb == null) return dated(b) - dated(a);
        if (ra == null) return 1;
        if (rb == null) return -1;
        return filters.sort === "ral_desc" ? rb - ra : ra - rb;
      }
      default:
        return dated(b) - dated(a);
    }
  });
}
