import type { ApplicationPackage } from "@/lib/ai/schema";

/** Contesto già prodotto in generazione: evita una seconda ricerca web. */
export function buildInterviewPrepContext(pkg: ApplicationPackage): string {
  const facts = pkg.company_research.facts
    .map((f) => `- ${f.label}: ${f.value}${f.source ? ` (${f.source})` : ""}`)
    .join("\n");
  const gaps = pkg.omitted_offer_requirements.map((g) => `- ${g}`).join("\n");
  const skills = pkg.matched_skills.join(", ");
  const notes = pkg.honesty_notes.map((n) => `- ${n}`).join("\n");

  return [
    `Azienda: ${pkg.company_name}`,
    `Ruolo: ${pkg.role_title}`,
    `Tipo: ${pkg.position_type}`,
    "",
    "Ricerca azienda (dalla candidatura):",
    pkg.company_research.summary,
    facts,
    pkg.company_research.unavailable_notes.length
      ? `Non reperibile: ${pkg.company_research.unavailable_notes.join(" · ")}`
      : "",
    "",
    `Competenze allineate: ${skills || "—"}`,
    gaps ? `Requisiti non coperti:\n${gaps}` : "",
    notes ? `Note di trasparenza:\n${notes}` : "",
    "",
    "Estratto lettera:",
    pkg.cover_letter.slice(0, 1200),
  ]
    .filter((line) => line !== "")
    .join("\n");
}
