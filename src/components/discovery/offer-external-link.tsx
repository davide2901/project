"use client";

import { resolveOfferLink } from "@/lib/discovery/offer-links";
import type { DiscoveredOffer } from "@/lib/types/database";

type Props = {
  offer: Pick<
    DiscoveredOffer,
    "company_name" | "role_title" | "location" | "source_url"
  >;
  /** `card` = compatto nella lista; `detail` = overlay/dettaglio */
  variant?: "card" | "detail";
  /** Evita che il click apra il pannello offerta nella lista */
  stopPropagation?: boolean;
};

export function OfferExternalLink({
  offer,
  variant = "detail",
  stopPropagation = false,
}: Props) {
  const link = resolveOfferLink(offer);

  function onClick(e: React.MouseEvent) {
    if (stopPropagation) e.stopPropagation();
  }

  if (variant === "card") {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer noopener"
        onClick={onClick}
        className="text-link inline-flex shrink-0 items-center gap-1 text-xs font-medium"
        title={link.hint}
      >
        {link.kind === "direct" ? "Inserzione" : "Cerca"}
        <span aria-hidden>↗</span>
      </a>
    );
  }

  return (
    <div className="space-y-1">
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer noopener"
        onClick={onClick}
        className="text-link inline-flex min-h-10 items-center gap-1.5 text-sm font-medium"
      >
        {link.label}
        <span aria-hidden>↗</span>
      </a>
      {link.hint ? (
        <p className="text-xs text-[var(--muted)]">{link.hint}</p>
      ) : null}
    </div>
  );
}
