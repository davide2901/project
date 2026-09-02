import PizZip from "pizzip";

import type { EuropeanCv } from "@/lib/cv/european-cv-schema";
import { europeanCvDocxFields } from "@/lib/cv/european-cv-template";

const TEMPLATE_URL = "/templates/cv-europass-word.docx";

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textboxPlain(inner: string): string {
  return [...inner.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
    .map((m) => m[1])
    .join("");
}

function normalizePlain(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function rewriteTextBoxInner(inner: string, newText: string): string {
  const pPr = inner.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
  const rPr = inner.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? "";

  const lines = newText.split("\n");
  return lines
    .map(
      (line) =>
        `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`,
    )
    .join("");
}

/** Marca testi esempio da svuotare (date/bullet del template fittizio). */
const CLEAR_MARKERS = [
  "2020 – Roma, Italia",
  "2018 – Roma, Italia",
  "DIPLOMA LICEO LINGUISTICO",
  "2022 – ATTUALE – Milano, Italia",
  "01/09/2020 – 05/03/2021",
  "Organizzazione e archiviazione di pratiche",
  "Supporto a 360 all'Executive",
  "ASSISTENTE DI DIREZIONE– NIKE",
  "©AZURIUS",
  "marie.dupont@mail.com",
  "maria.rossi/linkedin",
  "Diploma di Liceo Linguistico",
  "Liceo classico statale B.Russell",
  "Assistente di direzione",
  "Carrefourr",
  "Università di Roma LA SAPIENZA",
  "Laurea magistrale in Scienze Politiche",
  "01/09/2019 – 05/03/2021",
  "Nike",
  "Microsoft Word / Microsoft Excel",
  "Patente B/",
  "Esempio di Lettera di Presentazione",
];

function mapTextBox(plain: string, f: ReturnType<typeof europeanCvDocxFields>): string | null {
  const n = normalizePlain(plain);
  if (!n) return null;

  if (/^Mari\s*a\s*Rossi$/i.test(n) || /^Maria\s+Rossi$/i.test(n)) {
    return f.full_name;
  }
  if (n.includes("maria.rossi@mail.com")) {
    return f.email;
  }
  if (n.startsWith("Nazionalità")) {
    return f.nationality ? `Nazionalità : ${f.nationality}` : "Nazionalità :";
  }
  if (n.includes("(+39)")) {
    return f.phone;
  }
  if (n === "Milano, Italia") {
    return f.location;
  }
  if (n.startsWith("Presentazione:") && n.length > 20) {
    return f.summary ? `Presentazione: ${f.summary}` : "Presentazione:";
  }
  if (n.startsWith("Ho esperienza di diversi anni")) {
    return f.summary;
  }
  if (n.includes("LAUREA MAGISTRALE IN RELAZIONI")) {
    return f.education_block;
  }
  if (n.includes("ASSISTENTE DI DIREZIONE – CARREFOUR")) {
    return f.work_block;
  }
  if (n.includes("Microsoft Word   |   Microsoft Excel")) {
    return f.digital_skills;
  }
  if (n.includes("Lingua madre :ITALIANO")) {
    const parts = [
      f.language_mother ? `Lingua madre : ${f.language_mother}` : "",
      f.languages_other ? `Altre lingue : ${f.languages_other}` : "",
    ].filter(Boolean);
    return parts.join(" ");
  }
  if (n.includes("LINGUA MADRE : italiano")) {
    const parts = [
      f.language_mother ? `LINGUA MADRE : ${f.language_mother.toLowerCase()}` : "",
      f.languages_other
        ? `ALTRE LINGUE : ${f.languages_other.toLowerCase()}`
        : "",
    ].filter(Boolean);
    return parts.join("");
  }
  if (n.includes("Patente di guida")) {
    return f.additional || n;
  }

  if (CLEAR_MARKERS.some((marker) => n.includes(marker))) {
    return "";
  }

  return null;
}

export function fillDocumentXml(xml: string, cv: EuropeanCv): string {
  const f = europeanCvDocxFields(cv);

  return xml.replace(
    /<w:txbxContent>([\s\S]*?)<\/w:txbxContent>/g,
    (full, inner) => {
      const plain = textboxPlain(inner);
      if (!plain.trim()) return full;

      const mapped = mapTextBox(plain, f);
      if (mapped === null) return full;

      return `<w:txbxContent>${rewriteTextBoxInner(inner, mapped)}</w:txbxContent>`;
    },
  );
}

function stillHasSampleContent(xml: string): boolean {
  const plain = normalizePlain(textboxPlain(xml));
  return (
    plain.includes("CARREFOUR") ||
    plain.includes("LAUREA MAGISTRALE IN RELAZIONI INTERNAZIONALI") ||
    /Maria\s+Rossi/i.test(plain)
  );
}

/** Compila il template Word Europass sostituendo i testi esempio nelle textbox. */
export async function generateEuropassDocx(cv: EuropeanCv): Promise<Blob> {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) {
    throw new Error("Template Europass non trovato. Ricarica la pagina.");
  }

  const buffer = await res.arrayBuffer();
  const zip = new PizZip(buffer);

  const docXml = zip.file("word/document.xml")?.asText();
  if (!docXml) {
    throw new Error("Template Europass non valido.");
  }

  const filled = fillDocumentXml(docXml, cv);
  if (stillHasSampleContent(filled)) {
    throw new Error(
      "Impossibile compilare il template Word. Rigenera la candidatura e riprova.",
    );
  }

  zip.file("word/document.xml", filled);

  return zip.generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }) as Blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
