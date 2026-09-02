import { resolveApplicationOfferLink } from "@/lib/discovery/application-offer-link";

type Props = {
  companyName: string;
  roleTitle: string;
  offerSource?: string | null;
};

export function ApplicationOfferLink({
  companyName,
  roleTitle,
  offerSource,
}: Props) {
  const link = resolveApplicationOfferLink({
    company_name: companyName,
    role_title: roleTitle,
    offer_source: offerSource ?? null,
  });

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer noopener"
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
