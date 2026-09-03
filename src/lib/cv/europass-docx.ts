import {
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
  convertMillimetersToTwip,
} from "docx";

import type { EuropeanCv } from "@/lib/cv/european-cv-schema";

const EU_BLUE = "2A3C86";
const EU_ACCENT = "0563C1";
const TEXT = "3F3F3F";
const MUTED = "666666";

const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

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

function p(
  text: string,
  opts: {
    bold?: boolean;
    size?: number;
    color?: string;
    spacingAfter?: number;
    spacingBefore?: number;
    allCaps?: boolean;
  } = {},
): Paragraph {
  return new Paragraph({
    spacing: {
      after: opts.spacingAfter ?? 60,
      before: opts.spacingBefore ?? 0,
      line: 240,
    },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        size: opts.size ?? 16,
        color: opts.color ?? TEXT,
        font: "Calibri",
        allCaps: opts.allCaps,
      }),
    ],
  });
}

function sideHeading(title: string): Paragraph {
  return p(title, {
    bold: true,
    size: 14,
    color: "FFFFFF",
    spacingBefore: 140,
    spacingAfter: 60,
    allCaps: true,
  });
}

function sideLine(text: string): Paragraph {
  return p(text, { size: 13, color: "E8ECF5", spacingAfter: 40 });
}

function mainHeading(title: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80, before: 40, line: 240 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 8, color: EU_ACCENT, space: 4 },
    },
    children: [
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: 15,
        color: EU_ACCENT,
        font: "Calibri",
      }),
    ],
  });
}

function buildSidebar(cv: EuropeanCv): Paragraph[] {
  const mother = motherLanguage(cv);
  const others = otherLanguages(cv);
  const out: Paragraph[] = [];

  out.push(
    p("EUROPASS", {
      bold: true,
      size: 14,
      color: "FFFFFF",
      spacingAfter: 120,
      allCaps: true,
    }),
  );
  out.push(
    p(cv.full_name.trim(), {
      bold: true,
      size: 22,
      color: "FFFFFF",
      spacingAfter: 120,
    }),
  );

  if (cv.email?.trim()) out.push(sideLine(cv.email.trim()));
  if (cv.phone?.trim()) out.push(sideLine(cv.phone.trim()));
  if (cv.location?.trim()) out.push(sideLine(cv.location.trim()));

  if (mother || others) {
    out.push(sideHeading("Competenze linguistiche"));
    if (mother) out.push(sideLine(`Lingua madre: ${mother.toUpperCase()}`));
    if (others) out.push(sideLine(`Altre lingue: ${others.toUpperCase()}`));
  }

  if (cv.skills.length) {
    out.push(sideHeading("Competenze digitali"));
    out.push(sideLine(cv.skills.join("  ·  ")));
  }

  if (cv.additional.length) {
    out.push(sideHeading("Informazioni aggiuntive"));
    out.push(sideLine(cv.additional.join(" · ")));
  }

  return out;
}

function buildMain(cv: EuropeanCv): Paragraph[] {
  const out: Paragraph[] = [];

  if (cv.summary?.trim()) {
    out.push(mainHeading("Presentazione"));
    out.push(p(cv.summary.trim(), { size: 16, spacingAfter: 100 }));
  }

  if (cv.education.length) {
    out.push(mainHeading("Istruzione e formazione"));
    for (const entry of cv.education) {
      const title = [entry.qualification, entry.institution]
        .filter(Boolean)
        .join(" – ");
      const when = [entry.period, entry.location].filter(Boolean).join(" – ");
      if (title) out.push(p(title, { bold: true, size: 16, spacingAfter: 20 }));
      if (when) out.push(p(when, { size: 14, color: MUTED, spacingAfter: 80 }));
    }
  }

  if (cv.work_experience.length) {
    out.push(mainHeading("Esperienza lavorativa"));
    for (const entry of cv.work_experience) {
      const title = [entry.role, entry.employer].filter(Boolean).join(" – ");
      const when = [entry.period, entry.location].filter(Boolean).join(" – ");
      if (title) out.push(p(title, { bold: true, size: 16, spacingAfter: 20 }));
      if (when) out.push(p(when, { size: 14, color: MUTED, spacingAfter: 40 }));
      for (const h of entry.highlights) {
        out.push(
          new Paragraph({
            spacing: { after: 30, line: 230 },
            indent: { left: convertMillimetersToTwip(2) },
            children: [
              new TextRun({
                text: `• ${h}`,
                size: 15,
                color: TEXT,
                font: "Calibri",
              }),
            ],
          }),
        );
      }
      out.push(p("", { spacingAfter: 60 }));
    }
  }

  if (!out.length) {
    out.push(p("—", { color: MUTED }));
  }

  return out;
}

/** Genera un CV Europass .docx pulito (1 pagina, senza template / foto / marketing). */
export async function generateEuropassDocx(cv: EuropeanCv): Promise<Blob> {
  const pageW = convertMillimetersToTwip(210);
  const pageH = convertMillimetersToTwip(297);
  const margin = convertMillimetersToTwip(0);
  const contentW = pageW;
  const sideW = Math.round(contentW * 0.32);
  const mainW = contentW - sideW;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: pageW, height: pageH },
            margin: {
              top: margin,
              bottom: margin,
              left: margin,
              right: margin,
            },
          },
        },
        children: [
          new Table({
            width: { size: contentW, type: WidthType.DXA },
            layout: TableLayoutType.FIXED,
            columnWidths: [sideW, mainW],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: sideW, type: WidthType.DXA },
                    borders: NO_BORDER,
                    shading: { type: ShadingType.CLEAR, fill: EU_BLUE },
                    margins: {
                      top: convertMillimetersToTwip(7),
                      bottom: convertMillimetersToTwip(7),
                      left: convertMillimetersToTwip(5),
                      right: convertMillimetersToTwip(4),
                    },
                    children: buildSidebar(cv),
                  }),
                  new TableCell({
                    width: { size: mainW, type: WidthType.DXA },
                    borders: NO_BORDER,
                    shading: { type: ShadingType.CLEAR, fill: "FFFFFF" },
                    margins: {
                      top: convertMillimetersToTwip(7),
                      bottom: convertMillimetersToTwip(6),
                      left: convertMillimetersToTwip(5),
                      right: convertMillimetersToTwip(6),
                    },
                    children: buildMain(cv),
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** @deprecated kept for tests of legacy helpers if any remain */
export function normalizeMatch(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u2032']/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
