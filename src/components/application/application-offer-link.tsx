import { resolveApplicationOfferLink } from "@/lib/discovery/application-offer-link";

type Props = {
  companyName: string;
  roleTitle: string;
  offerSource?: string | null;
  variant?: "card" | "plain";
};

export function ApplicationOfferLink({
  companyName,
  roleTitle,
  offerSource,
  variant = "card",
}: Props) {
  const link = resolveApplicationOfferLink({
    company_name: companyName,
    role_title: roleTitle,
    offer_source: offerSource ?? null,
  });

  const inner = (
    <>
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
    </>
  );

  if (variant === "plain") {
    return <div className="space-y-1">{inner}</div>;
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
      {inner}
    </div>
  );
}
