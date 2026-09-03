import {
  formatSalaryCompact,
  formatSalaryDetail,
  type SalaryFields,
} from "@/lib/discovery/salary";

export function OfferSalaryLine({
  offer,
  variant = "card",
}: {
  offer: SalaryFields;
  variant?: "card" | "detail";
}) {
  if (variant === "card") {
    const compact = formatSalaryCompact(offer);
    if (!compact) return null;
    const uncertain = offer.salary_source === "stima";
    return (
      <span className="text-xs text-[var(--muted)]">
        {" · "}
        <span title={uncertain ? "Stima da fonti pubbliche, non certa" : "Da annuncio"}>
          {compact}
          {uncertain ? "*" : ""}
        </span>
      </span>
    );
  }

  const detail = formatSalaryDetail(offer);
  if (!detail) return null;

  return (
    <div
      className={
        detail.uncertain
          ? "rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2"
          : "rounded-lg bg-[var(--tint)] px-3 py-2"
      }
    >
      <p className="text-sm text-[var(--ink)]">
        <span className="font-semibold">RAL: </span>
        {detail.amount} €
      </p>
      <p className="text-xs text-[var(--muted)]">{detail.sourceLabel}</p>
    </div>
  );
}
