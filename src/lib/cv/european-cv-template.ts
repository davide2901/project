import type { EuropeanCv } from "@/lib/cv/european-cv-schema";

const EU_BLUE = "#2A3C86";
const EU_ACCENT = "#0563C1";
const TEXT = "#3F3F3F";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function asset(path: string, baseUrl = ""): string {
  const prefix = baseUrl.replace(/\/$/, "");
  return `${prefix}/cv-europass/${path}`;
}

function motherLanguage(cv: EuropeanCv): string | null {
  const explicit = cv.languages.find((l) =>
    /madrelingua|nativo|native|materna/i.test(l.level),
  );
  if (explicit) return explicit.language;

  const italian = cv.languages.find((l) => /^italian/i.test(l.language));
  return italian?.language ?? null;
}

function otherLanguages(cv: EuropeanCv): string {
  const mother = motherLanguage(cv)?.toLowerCase() ?? "";
  return cv.languages
    .filter((l) => {
      if (/madrelingua|nativo|native|materna/i.test(l.level)) return false;
      if (mother && l.language.toLowerCase() === mother) return false;
      return true;
    })
    .map((l) => (l.level ? `${l.language} (${l.level})` : l.language))
    .join(" | ");
}

function renderWorkEntries(cv: EuropeanCv): string {
  if (!cv.work_experience.length) {
    return `<p class="ep-empty">—</p>`;
  }
  return cv.work_experience
    .map((entry) => {
      const title = [entry.role, entry.employer].filter(Boolean).join(" – ");
      const when = [entry.period, entry.location].filter(Boolean).join(" – ");
      const bullets =
        entry.highlights.length > 0
          ? `<ul>${entry.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ul>`
          : "";
      return `<article class="ep-entry">
  <h3 class="ep-entry-title">${escapeHtml(title)}</h3>
  ${when ? `<p class="ep-entry-when">${escapeHtml(when)}</p>` : ""}
  ${bullets}
</article>`;
    })
    .join("");
}

function renderEducationEntries(cv: EuropeanCv): string {
  if (!cv.education.length) {
    return `<p class="ep-empty">—</p>`;
  }
  return cv.education
    .map((entry) => {
      const title = [entry.qualification, entry.institution]
        .filter(Boolean)
        .join(" – ");
      const when = [entry.period, entry.location].filter(Boolean).join(" – ");
      return `<article class="ep-entry">
  <h3 class="ep-entry-title">${escapeHtml(title)}</h3>
  ${when ? `<p class="ep-entry-when">${escapeHtml(when)}</p>` : ""}
</article>`;
    })
    .join("");
}

function renderSection(title: string, body: string): string {
  if (!body.trim()) return "";
  return `<section class="ep-section">
  <h2 class="ep-section-title">${escapeHtml(title)}</h2>
  ${body}
</section>`;
}

/** HTML CV stile Europass (layout del template Word fornito). */
export function renderEuropeanCvHtml(cv: EuropeanCv, baseUrl = ""): string {
  const mother = motherLanguage(cv);
  const others = otherLanguages(cv);
  const digitalSkills = cv.skills.join("   |   ");
  const additional = cv.additional.join(" · ");

  const contacts = [
    cv.email
      ? `<p class="ep-contact"><img src="${asset("image6.svg", baseUrl)}" alt="" class="ep-icon" /> ${escapeHtml(cv.email)}</p>`
      : "",
    cv.phone
      ? `<p class="ep-contact"><span class="ep-icon-phone">☎</span> ${escapeHtml(cv.phone)}</p>`
      : "",
    cv.location
      ? `<p class="ep-contact"><img src="${asset("image8.svg", baseUrl)}" alt="" class="ep-icon" /> ${escapeHtml(cv.location)}</p>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const sidebarLang = renderSection(
    "Competenze linguistiche",
    [
      mother
        ? `<p class="ep-side-line"><strong>Lingua madre:</strong> ${escapeHtml(mother.toUpperCase())}</p>`
        : "",
      others
        ? `<p class="ep-side-line"><strong>Altre lingue:</strong> ${escapeHtml(others.toUpperCase())}</p>`
        : "",
    ].join(""),
  );

  const sidebarDigital = cv.skills.length
    ? renderSection(
        "Competenze digitali",
        `<p class="ep-side-line">${escapeHtml(digitalSkills)}</p>`,
      )
    : "";

  const sidebarExtra = additional
    ? renderSection(
        "Informazioni aggiuntive",
        `<p class="ep-side-line">${escapeHtml(additional)}</p>`,
      )
    : "";

  const mainPresentation = cv.summary?.trim()
    ? renderSection(
        "Presentazione",
        `<p class="ep-body">${escapeHtml(cv.summary.trim())}</p>`,
      )
    : "";

  const mainWork = renderSection("Esperienza lavorativa", renderWorkEntries(cv));
  const mainEducation = renderSection(
    "Istruzione e formazione",
    renderEducationEntries(cv),
  );

  return `<div class="ep-root">
  <aside class="ep-sidebar">
    <div class="ep-brand">
      <img src="${asset("image5.png", baseUrl)}" alt="Europass" class="ep-brand-logo" />
    </div>
    <div class="ep-photo-wrap" aria-hidden="true"></div>
    <h1 class="ep-name">${escapeHtml(cv.full_name.trim())}</h1>
    <div class="ep-contacts">${contacts}</div>
    ${sidebarLang}
    ${sidebarDigital}
    ${sidebarExtra}
  </aside>
  <main class="ep-main">
    ${mainPresentation}
    ${mainEducation}
    ${mainWork}
  </main>
</div>`;
}

const PRINT_STYLES = `
  @page { margin: 0; size: A4 portrait; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    font-family: Calibri, "Trebuchet MS", "Helvetica Neue", Arial, sans-serif;
    color: ${TEXT};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .ep-root {
    display: grid;
    grid-template-columns: 31% 69%;
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    overflow: hidden;
    page-break-after: avoid;
    page-break-inside: avoid;
  }
  .ep-sidebar {
    background: ${EU_BLUE};
    color: #fff;
    padding: 8mm 6mm 8mm;
    height: 297mm;
  }
  .ep-brand { margin-bottom: 4mm; }
  .ep-brand-logo { width: 36mm; max-width: 100%; height: auto; }
  .ep-photo-wrap { display: none; }
  .ep-name {
    margin: 0 0 3mm;
    font-size: 15pt;
    line-height: 1.12;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
  .ep-contacts { margin-bottom: 4mm; font-size: 8pt; line-height: 1.35; }
  .ep-contact {
    display: flex;
    align-items: flex-start;
    gap: 1.5mm;
    margin: 0 0 1.5mm;
    word-break: break-word;
  }
  .ep-icon { width: 3mm; height: 3mm; flex-shrink: 0; margin-top: 0.4mm; filter: brightness(0) invert(1); }
  .ep-icon-phone { flex-shrink: 0; width: 3mm; text-align: center; opacity: 0.95; font-size: 7pt; }
  .ep-sidebar .ep-section { margin-top: 3.5mm; }
  .ep-sidebar .ep-section-title {
    margin: 0 0 1.5mm;
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgb(255 255 255 / 0.92);
  }
  .ep-side-line {
    margin: 0;
    font-size: 7pt;
    line-height: 1.32;
    color: rgb(255 255 255 / 0.92);
  }
  .ep-main {
    padding: 8mm 7mm 8mm 6mm;
    background: #fff;
    height: 297mm;
    overflow: hidden;
  }
  .ep-main .ep-section { margin-bottom: 4mm; }
  .ep-main .ep-section-title {
    margin: 0 0 2mm;
    padding-bottom: 0.8mm;
    border-bottom: 1pt solid ${EU_ACCENT};
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${EU_ACCENT};
  }
  .ep-body { margin: 0; font-size: 8.5pt; line-height: 1.32; }
  .ep-entry { margin: 0 0 2.5mm; }
  .ep-entry-title {
    margin: 0 0 0.5mm;
    font-size: 8.5pt;
    font-weight: 700;
    color: ${TEXT};
  }
  .ep-entry-when {
    margin: 0 0 1mm;
    font-size: 7.5pt;
    color: #666;
  }
  .ep-entry ul {
    margin: 0;
    padding-left: 3.5mm;
    font-size: 8pt;
    line-height: 1.28;
  }
  .ep-entry li { margin-bottom: 0.5mm; }
  .ep-empty { margin: 0; font-size: 8pt; color: #888; }
`;

/** Documento HTML completo per «Salva come PDF». */
export function buildCvPrintHtml(
  cv: EuropeanCv,
  title?: string,
  baseUrl = "",
): string {
  const safeTitle = escapeHtml((title ?? `CV ${cv.full_name}`).slice(0, 80));
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  ${renderEuropeanCvHtml(cv, baseUrl)}
</body>
</html>`;
}

/** Testo plain per copia/incolla e overlay nell'app. */
export function europeanCvToPlainText(cv: EuropeanCv): string {
  const lines: string[] = [cv.full_name.trim()];

  const contacts = [cv.email, cv.phone, cv.location]
    .filter((v): v is string => Boolean(v?.trim()))
    .join(" · ");
  if (contacts) lines.push(contacts);
  lines.push("");

  if (cv.summary?.trim()) {
    lines.push("PRESENTAZIONE", cv.summary.trim(), "");
  }

  if (cv.education.length) {
    lines.push("ISTRUZIONE E FORMAZIONE");
    for (const entry of cv.education) {
      lines.push(
        [entry.qualification, entry.institution]
          .filter(Boolean)
          .join(" – "),
      );
      const when = [entry.period, entry.location].filter(Boolean).join(" – ");
      if (when) lines.push(when);
      lines.push("");
    }
  }

  if (cv.work_experience.length) {
    lines.push("ESPERIENZA LAVORATIVA");
    for (const entry of cv.work_experience) {
      lines.push([entry.role, entry.employer].filter(Boolean).join(" – "));
      const when = [entry.period, entry.location].filter(Boolean).join(" – ");
      if (when) lines.push(when);
      for (const h of entry.highlights) lines.push(`• ${h}`);
      lines.push("");
    }
  }

  if (cv.skills.length) {
    lines.push("COMPETENZE DIGITALI", cv.skills.join(" | "), "");
  }

  if (cv.languages.length) {
    lines.push(
      "COMPETENZE LINGUISTICHE",
      ...cv.languages.map((l) => `${l.language}: ${l.level}`),
      "",
    );
  }

  if (cv.additional.length) {
    lines.push("INFORMAZIONI AGGIUNTIVE", ...cv.additional.map((a) => `• ${a}`));
  }

  return lines.join("\n").trim();
}

/** Blocchi di testo per il template Word Europass. */
export function europeanCvDocxFields(cv: EuropeanCv) {
  const mother = motherLanguage(cv);
  const others = otherLanguages(cv);

  const educationBlock = cv.education
    .map((entry) => {
      const title = [entry.qualification, entry.institution]
        .filter(Boolean)
        .join(" – ");
      const when = [entry.period, entry.location].filter(Boolean).join(" – ");
      return [title, when].filter(Boolean).join("\n");
    })
    .join("\n\n");

  const workBlock = cv.work_experience
    .map((entry) => {
      const title = [entry.role, entry.employer].filter(Boolean).join(" – ");
      const when = [entry.period, entry.location].filter(Boolean).join(" – ");
      const bullets = entry.highlights.map((h) => `• ${h}`).join("\n");
      return [title, when, bullets].filter(Boolean).join("\n");
    })
    .join("\n\n");

  return {
    full_name: cv.full_name.trim(),
    email: cv.email?.trim() ?? "",
    phone: cv.phone?.trim() ?? "",
    location: cv.location?.trim() ?? "",
    nationality: cv.location?.toLowerCase().includes("ital") || mother
      ? "Italiana"
      : "",
    summary: cv.summary?.trim() ?? "",
    education_block: educationBlock,
    work_block: workBlock,
    digital_skills: cv.skills.join("   |   "),
    language_mother: mother?.toUpperCase() ?? "",
    languages_other: others.toUpperCase(),
    additional: cv.additional.join(" · "),
  };
}
