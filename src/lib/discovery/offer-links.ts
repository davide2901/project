import { normalizeSourceUrl } from "@/lib/discovery/dedupe";
import type { DiscoveredOfferItem } from "@/lib/ai/discovery-schema";

const URL_RE =
  /https?:\/\/[^\s<>"')\]},]+/gi;

/** Domini tipici di annunci di lavoro (priorità nel matching). */
const JOB_HOST_HINTS = [
  "linkedin.com",
  "infojobs.it",
  "indeed.com",
  "glassdoor.",
  "monster.",
  "careers.",
  "jobs.",
  "lavoro.",
  "greenhouse.io",
  "lever.co",
  "workday",
  "teamtailor",
  "bamboohr",
  "ashbyhq",
  "join.com",
  "welcometothejungle",
  "talent.",
];

export type GroundingWebRef = {
  uri?: string;
  title?: string;
  domain?: string;
};

export type OfferLinkKind = "direct" | "search";

export type ResolvedOfferLink = {
  href: string;
  kind: OfferLinkKind;
  label: string;
  hint?: string;
};

export function extractUrlsFromText(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of text.matchAll(URL_RE)) {
    const cleaned = cleanTrailingUrlPunctuation(match[0] ?? "");
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
  }
  return out;
}

function cleanTrailingUrlPunctuation(url: string): string {
  return url.replace(/[.,;:!?)]+$/, "");
}

function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrl(url: string | null | undefined): string | null {
  const normalized = normalizeSourceUrl(url ?? "");
  if (!normalized || !isValidHttpUrl(normalized)) return null;
  return normalized;
}

function companyTokens(company: string): string[] {
  return company
    .toLowerCase()
    .split(/[\s|/&,.\-–—]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function scoreUrlForOffer(
  url: string,
  meta: GroundingWebRef | undefined,
  offer: Pick<DiscoveredOfferItem, "company_name" | "role_title">,
): number {
  const hay = `${url} ${meta?.title ?? ""} ${meta?.domain ?? ""}`.toLowerCase();
  const companyHits = companyTokens(offer.company_name).filter((t) =>
    hay.includes(t),
  ).length;
  const roleWords = offer.role_title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  const roleHits = roleWords.filter((w) => hay.includes(w)).length;
  const jobHost = JOB_HOST_HINTS.some((h) => hay.includes(h)) ? 2 : 0;
  return companyHits * 3 + roleHits + jobHost;
}

function pickUrlForOffer(
  offer: DiscoveredOfferItem,
  candidates: GroundingWebRef[],
): string | null {
  let best: { url: string; score: number } | null = null;
  for (const ref of candidates) {
    const url = ref.uri ? normalizeUrl(ref.uri) : null;
    if (!url) continue;
    const score = scoreUrlForOffer(url, ref, offer);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { url, score };
  }
  return best?.url ?? null;
}

/** URL di ricerca Google quando l'inserzione diretta non è nota. */
export function buildOfferSearchUrl(
  company: string,
  role: string,
  location?: string | null,
): string {
  const parts = [company, role, location, "offerta lavoro"].filter(Boolean);
  return `https://www.google.com/search?q=${encodeURIComponent(parts.join(" "))}`;
}

export function resolveOfferLink(
  offer: Pick<
    DiscoveredOfferItem,
    "company_name" | "role_title" | "location" | "source_url"
  >,
): ResolvedOfferLink {
  const direct = normalizeUrl(offer.source_url);
  if (direct) {
    return {
      href: direct,
      kind: "direct",
      label: "Vedi inserzione",
    };
  }
  return {
    href: buildOfferSearchUrl(
      offer.company_name,
      offer.role_title,
      offer.location,
    ),
    kind: "search",
    label: "Cerca online",
    hint: "Inserzione diretta non disponibile",
  };
}

export function enrichOffersWithUrls(
  offers: DiscoveredOfferItem[],
  context: { text?: string; groundingUrls?: GroundingWebRef[] },
): DiscoveredOfferItem[] {
  const text = context.text ?? "";
  const grounding = context.groundingUrls ?? [];
  const textUrls = extractUrlsFromText(text).map((uri) => ({ uri }));
  const pool = [
    ...grounding.filter((g) => g.uri),
    ...textUrls,
  ] as GroundingWebRef[];

  return offers.map((offer) => {
    const existing = normalizeUrl(offer.source_url);
    if (existing) return { ...offer, source_url: existing };

    const inline = extractUrlsFromText(
      `${offer.snippet}\n${offer.match_reason}`,
    );
    const inlineUrl = inline.map((u) => normalizeUrl(u)).find(Boolean);
    if (inlineUrl) return { ...offer, source_url: inlineUrl };

    const matched = pickUrlForOffer(offer, pool);
    if (matched) return { ...offer, source_url: matched };

    return { ...offer, source_url: null };
  });
}

export function extractLinkFromOfferSource(text: string | null): string | null {
  if (!text?.trim()) return null;
  const labeled =
    text.match(/^(?:Link|Cerca online):\s*(.+)$/im)?.[1]?.trim() ?? null;
  const fromLabel = labeled ? normalizeUrl(labeled) : null;
  if (fromLabel) return fromLabel;
  return extractUrlsFromText(text).map((u) => normalizeUrl(u)).find(Boolean) ?? null;
}
