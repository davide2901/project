import {
  buildOfferSearchUrl,
  extractLinkFromOfferSource,
} from "@/lib/discovery/offer-links";

type OfferRef = {
  company_name: string;
  role_title: string;
  location?: string | null;
  offer_source?: string | null;
};

export function resolveApplicationOfferLink(offer: OfferRef): {
  href: string;
  kind: "direct" | "search";
  label: string;
  hint?: string;
} {
  const fromSource = extractLinkFromOfferSource(offer.offer_source ?? null);
  if (fromSource) {
    const isSearch = /google\.com\/search/i.test(fromSource);
    return {
      href: fromSource,
      kind: isSearch ? "search" : "direct",
      label: isSearch ? "Cerca online" : "Vedi inserzione",
      hint: isSearch ? "Inserzione diretta non disponibile" : undefined,
    };
  }
  return {
    href: buildOfferSearchUrl(
      offer.company_name,
      offer.role_title,
      offer.location ?? null,
    ),
    kind: "search",
    label: "Cerca online",
    hint: "Inserzione diretta non disponibile",
  };
}
