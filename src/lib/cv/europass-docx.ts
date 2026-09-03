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
    .map((m) => m[1] ?? "")
    .join("");
}

/** Normalizza per confronti (apostrofi tipografici, spazi, case). */
export function normalizeMatch(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function rewriteTextBoxInner(inner: string, newText: string): string {
  const pPr = inner.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
  const rPr = inner.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? "";

  if (!newText.trim()) {
    return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve"></w:t></w:r></w:p>`;
  }

  const lines = newText.split("\n");
  return lines
    .map(
      (line) =>
        `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`,
    )
    .join("");
}

/** Residui tipici del template Maria Rossi / Nike / marketing Azurius. */
const CLEAR_SUBSTRINGS = [
  "2020 – roma, italia",
  "2018 – roma, italia",
  "diploma liceo linguistico",
  "2022 – attuale",
  "01/09/2020",
  "01/09/2019",
  "organizzazione e archiviazione di pratiche",
  "supporto a 360 all'executive",
  "gestione e archiviazione della corrispondenza",
  "organizzazione business travel",
  "organizzazione meeting e affiancamento",
  "assistente di direzione– nike",
  "©azurius",
  "marie.dupont@mail.com",
  "maria.rossi/linkedin",
  "diploma di liceo linguistico",
  "liceo classico statale b.russell",
  "carrefourr",
  "università di roma la sapienza",
  "laurea magistrale in scienze politiche",
  "laurea magistrale in relazioni",
  "patente b/",
  "esempio di lettera di presentazione",
  "copyright - leggere",
  "modelli-di-curriculum",
  "modeles-de-cv",
  "come fare il cv europass",
  "come scrivere il profilo personale",
  "10 domande frequenti",
  "pregi e difetti al colloquio",
  "questo modello di curriculum vitae europeo",
  "caro(a) candidato",
  "scarica il cv europass",
  "nike",
  "assistente di direzione",
];

function shouldClear(normalized: string): boolean {
  if (!normalized) return false;
  return CLEAR_SUBSTRINGS.some((marker) => normalized.includes(marker));
}

function mapTextBox(
  plain: string,
  f: ReturnType<typeof europeanCvDocxFields>,
): string | null {
  const n = normalizeMatch(plain);
  if (!n) return null;

  // Nome
  if (/^mari\s*a\s*rossi$/.test(n) || /^maria\s+rossi$/.test(n)) {
    return f.full_name;
  }

  // Contatti
  if (n.includes("maria.rossi@mail.com") || n.includes("marie.dupont@mail.com")) {
    return f.email;
  }
  if (n.includes("maria.rossi/linkedin")) {
    return "";
  }
  if (n.startsWith("nazionalit")) {
    return f.nationality ? `Nazionalità : ${f.nationality}` : "Nazionalità :";
  }
  if (n.includes("(+39)") || /^\(?\+?39/.test(n) || n.includes("06 06 06")) {
    return f.phone;
  }
  if (n === "milano, italia") {
    return f.location;
  }

  // Presentazione
  if (n.startsWith("presentazione:") && n.length > 20) {
    return f.summary ? `Presentazione: ${f.summary}` : "Presentazione:";
  }
  if (n.startsWith("ho esperienza di diversi anni")) {
    return f.summary;
  }
  if (n === "presentazione :" || n === "presentazione:") {
    return "Presentazione:";
  }

  // Istruzione / lavoro (blocchi principali del template)
  if (n.includes("laurea magistrale in relazioni")) {
    return f.education_block;
  }
  if (n.includes("assistente di direzione") && n.includes("carrefour")) {
    return f.work_block;
  }

  // Competenze digitali (pipe o slash, spazi variabili)
  if (
    n.includes("microsoft word") &&
    n.includes("microsoft excel") &&
    (n.includes("power point") || n.includes("powerpoint") || n.includes("outlook"))
  ) {
    return f.digital_skills || "";
  }

  // Lingue
  if (n.includes("lingua madre") && n.includes("italiano")) {
    const parts = [
      f.language_mother ? `Lingua madre : ${f.language_mother}` : "",
      f.languages_other ? `Altre lingue : ${f.languages_other}` : "",
    ].filter(Boolean);
    return parts.join(" ");
  }
  if (n.includes("lingua madre : italiano") || n.startsWith("lingua madre :")) {
    const parts = [
      f.language_mother ? `LINGUA MADRE : ${f.language_mother.toLowerCase()}` : "",
      f.languages_other
        ? `ALTRE LINGUE : ${f.languages_other.toLowerCase()}`
        : "",
    ].filter(Boolean);
    return parts.join(" ");
  }

  // Patente / aggiuntive
  if (n.startsWith("patente di guida")) {
    return f.additional || "";
  }

  // Intestazioni sezione: lasciare
  if (
    n === "istruzione e formazione" ||
    n === "esperienza lavorativa" ||
    n === "competenze digitali" ||
    n === "competenze linguistiche" ||
    n === "patente di guida" ||
    n === "contatti"
  ) {
    return null;
  }

  if (shouldClear(n)) {
    return "";
  }

  return null;
}

/**
 * Rimuove la pagina istruzioni/copyright: solo paragrafi di testo dopo il
 * page-break, senza tagliare i drawing (textbox del CV spesso ancorati dopo).
 */
export function stripTrailingTemplatePages(xml: string): string {
  const pageBreak = xml.search(/<w:br[^>]*w:type="page"[^>]*\/>/);
  if (pageBreak === -1) return xml;

  const paraStart = xml.lastIndexOf("<w:p ", pageBreak);
  const paraStartAlt = xml.lastIndexOf("<w:p>", pageBreak);
  const start = Math.max(paraStart, paraStartAlt);
  if (start === -1) return xml;

  const after = xml.slice(start);
  // Elimina solo paragrafi "puri" (senza w:drawing / pict) fino a sectPr.
  const cleanedAfter = after.replace(
    /<w:p[ >][\s\S]*?<\/w:p>/g,
    (para) => {
      if (/<w:drawing[\s>]|<w:pict[\s>]|<mc:AlternateContent/i.test(para)) {
        return para;
      }
      // tieni sectPr wrapper se presente
      if (/<w:sectPr[\s>]/.test(para)) return para;
      return "";
    },
  );

  return xml.slice(0, start) + cleanedAfter;
}

export function fillDocumentXml(xml: string, cv: EuropeanCv): string {
  const f = europeanCvDocxFields(cv);

  let next = xml.replace(
    /<w:txbxContent>([\s\S]*?)<\/w:txbxContent>/g,
    (full, inner) => {
      const plain = textboxPlain(inner);
      if (!plain.trim()) return full;

      const mapped = mapTextBox(plain, f);
      if (mapped === null) return full;

      return `<w:txbxContent>${rewriteTextBoxInner(inner, mapped)}</w:txbxContent>`;
    },
  );

  next = stripTrailingTemplatePages(next);
  return next;
}

function stillHasSampleContent(xml: string): boolean {
  const plain = normalizeMatch(textboxPlain(xml));
  return (
    plain.includes("carrefour") ||
    plain.includes("laurea magistrale in relazioni internazionali") ||
    plain.includes("maria rossi") ||
    plain.includes("supporto a 360 all'executive") ||
    (plain.includes("microsoft word") && plain.includes("social media"))
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
