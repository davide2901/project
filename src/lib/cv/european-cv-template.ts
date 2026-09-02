import type { EuropeanCv } from "@/lib/cv/european-cv-schema";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function contactLine(cv: EuropeanCv): string {
  return [cv.location, cv.email, cv.phone]
    .filter((v): v is string => Boolean(v?.trim()))
    .join(" · ");
}

function renderSection(title: string, body: string): string {
  if (!body.trim()) return "";
  return `<section class="cv-section">
  <h2>${escapeHtml(title)}</h2>
  ${body}
</section>`;
}

function renderWorkExperience(cv: EuropeanCv): string {
  if (!cv.work_experience.length) return "";
  const items = cv.work_experience
    .map((entry) => {
      const meta = [entry.period, entry.role, entry.employer, entry.location]
        .filter((v): v is string => Boolean(v?.trim()))
        .join(" · ");
      const bullets =
        entry.highlights.length > 0
          ? `<ul>${entry.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ul>`
          : "";
      return `<article class="cv-entry">
  <p class="cv-entry-meta">${escapeHtml(meta)}</p>
  ${bullets}
</article>`;
    })
    .join("");
  return renderSection("Esperienza lavorativa", items);
}

function renderEducation(cv: EuropeanCv): string {
  if (!cv.education.length) return "";
  const items = cv.education
    .map((entry) => {
      const meta = [entry.period, entry.qualification, entry.institution, entry.location]
        .filter((v): v is string => Boolean(v?.trim()))
        .join(" · ");
      return `<article class="cv-entry"><p class="cv-entry-meta">${escapeHtml(meta)}</p></article>`;
    })
    .join("");
  return renderSection("Istruzione e formazione", items);
}

function renderSkills(cv: EuropeanCv): string {
  if (!cv.skills.length) return "";
  const chips = cv.skills
    .map((s) => `<span class="cv-skill">${escapeHtml(s)}</span>`)
    .join("");
  return renderSection(
    "Capacità e competenze",
    `<div class="cv-skills">${chips}</div>`,
  );
}

function renderLanguages(cv: EuropeanCv): string {
  if (!cv.languages.length) return "";
  const items = cv.languages
    .map((l) => `<li><strong>${escapeHtml(l.language)}</strong> — ${escapeHtml(l.level)}</li>`)
    .join("");
  return renderSection("Lingue", `<ul class="cv-list">${items}</ul>`);
}

function renderAdditional(cv: EuropeanCv): string {
  if (!cv.additional.length) return "";
  const items = cv.additional.map((a) => `<li>${escapeHtml(a)}</li>`).join("");
  return renderSection("Informazioni aggiuntive", `<ul class="cv-list">${items}</ul>`);
}

/** HTML del CV per anteprima/stampa (layout europeo a sezioni). */
export function renderEuropeanCvHtml(cv: EuropeanCv): string {
  const contacts = contactLine(cv);
  const summary = cv.summary?.trim()
    ? renderSection(
        "Sintesi professionale",
        `<p class="cv-summary">${escapeHtml(cv.summary.trim())}</p>`,
      )
    : "";

  return `<div class="cv-root">
  <header class="cv-header">
    <h1>${escapeHtml(cv.full_name.trim())}</h1>
    ${contacts ? `<p class="cv-contacts">${escapeHtml(contacts)}</p>` : ""}
  </header>
  ${summary}
  ${renderWorkExperience(cv)}
  ${renderEducation(cv)}
  ${renderSkills(cv)}
  ${renderLanguages(cv)}
  ${renderAdditional(cv)}
</div>`;
}

const PRINT_STYLES = `
  @page { margin: 10mm 12mm; size: A4; }
  * { box-sizing: border-box; }
  body {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #0b1f36;
    margin: 0;
    line-height: 1.4;
    font-size: 9.5pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .cv-root { max-width: 100%; }
  .cv-header {
    background: #1a4b7c;
    color: #fff;
    padding: 14pt 16pt 12pt;
    margin: 0 0 12pt;
    border-radius: 2pt;
  }
  .cv-header h1 {
    margin: 0 0 4pt;
    font-size: 18pt;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .cv-contacts {
    margin: 0;
    font-size: 9pt;
    opacity: 0.92;
  }
  .cv-section { margin: 0 0 10pt; }
  .cv-section h2 {
    margin: 0 0 5pt;
    padding-bottom: 2pt;
    border-bottom: 1.5pt solid #1a4b7c;
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #1a4b7c;
  }
  .cv-summary { margin: 0; }
  .cv-entry { margin: 0 0 7pt; }
  .cv-entry-meta {
    margin: 0 0 2pt;
    font-weight: 600;
    font-size: 9pt;
  }
  .cv-entry ul, .cv-list {
    margin: 0;
    padding-left: 1.1em;
  }
  .cv-entry li, .cv-list li { margin: 0 0 2pt; }
  .cv-skills {
    display: flex;
    flex-wrap: wrap;
    gap: 4pt;
  }
  .cv-skill {
    display: inline-block;
    padding: 2pt 6pt;
    border: 0.75pt solid #c5d4e4;
    border-radius: 999pt;
    font-size: 8.5pt;
    background: #f4f8fc;
  }
`;

/** Documento HTML completo per «Salva come PDF». */
export function buildCvPrintHtml(cv: EuropeanCv, title?: string): string {
  const safeTitle = escapeHtml((title ?? `CV ${cv.full_name}`).slice(0, 80));
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  ${renderEuropeanCvHtml(cv)}
</body>
</html>`;
}

/** Testo plain per copia/incolla e overlay nell'app. */
export function europeanCvToPlainText(cv: EuropeanCv): string {
  const lines: string[] = [cv.full_name.trim()];

  const contacts = contactLine(cv);
  if (contacts) lines.push(contacts);
  lines.push("");

  if (cv.summary?.trim()) {
    lines.push("SINTESI PROFESSIONALE", cv.summary.trim(), "");
  }

  if (cv.work_experience.length) {
    lines.push("ESPERIENZA LAVORATIVA");
    for (const entry of cv.work_experience) {
      const meta = [entry.period, entry.role, entry.employer, entry.location]
        .filter((v): v is string => Boolean(v?.trim()))
        .join(" · ");
      lines.push(meta);
      for (const h of entry.highlights) lines.push(`• ${h}`);
      lines.push("");
    }
  }

  if (cv.education.length) {
    lines.push("ISTRUZIONE E FORMAZIONE");
    for (const entry of cv.education) {
      lines.push(
        [entry.period, entry.qualification, entry.institution, entry.location]
          .filter((v): v is string => Boolean(v?.trim()))
          .join(" · "),
      );
    }
    lines.push("");
  }

  if (cv.skills.length) {
    lines.push("CAPACITÀ E COMPETENZE", cv.skills.join(" · "), "");
  }

  if (cv.languages.length) {
    lines.push(
      "LINGUE",
      ...cv.languages.map((l) => `${l.language}: ${l.level}`),
      "",
    );
  }

  if (cv.additional.length) {
    lines.push("INFORMAZIONI AGGIUNTIVE", ...cv.additional.map((a) => `• ${a}`));
  }

  return lines.join("\n").trim();
}
