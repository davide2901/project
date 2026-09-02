import PizZip from "pizzip";

import type { EuropeanCv } from "@/lib/cv/european-cv-schema";
import { europeanCvDocxFields } from "@/lib/cv/european-cv-template";

const TEMPLATE_URL = "/templates/cv-europass-word.docx";

/** Testo esempio nel template Word originale (Azurius Europass). */
const SAMPLE = {
  full_name: "Maria Rossi",
  email: "maria.rossi@mail.com",
  phone: "666666666",
  phoneFormatted: "(+39) 666666666",
  phoneAlt: "(+39) 06 06 06 06 06",
  location: "Milano, Italia",
  linkedin: "maria.rossi/linkedin",
  nationality: "Italiana",
  summary:
    "Ho esperienza di diversi anni come Assistente di direzione, amo il mio lavoro e mi piacerebbe mettermi alla prova in un altro settore. La vosra azienda mi interessa particolarmente. Sono attenta ed entusiasta, mi impegno per portare sempre a termine i miei progetti. Spero di poter condividere la mia esperienza con voi.",
  educationTitle:
    "LAUREA MAGISTRALE IN RELAZIONI INTERNAZIONALI – Università di Roma LA SAPIENZA",
  educationPeriod1: "2020 – Roma, Italia",
  educationPeriod2: "2018 – Roma, Italia",
  educationDiploma:
    "DIPLOMA LICEO LINGUISTICO – Liceo classico statale B.Russell",
  work1Title: "ASSISTENTE DI DIREZIONE – CARREFOUR",
  work1Period: "2022 – ATTUALE – Milano, Italia",
  work1Bullet1:
    "Organizzazione e archiviazione di pratiche e documenti di lavoro e personali.",
  work1Bullet2: "Gestione e archiviazione della corrispondenza.",
  work1Bullet3: "Organizzazione meeting e affiancamento al Manager.",
  work2Title: "ASSISTENTE DI DIREZIONE– NIKE",
  work2Period: "01/09/2020 – 05/03/2021 – Roma, Italia",
  work2Bullet1: "Supporto a 360 all'Executive.",
  work2Bullet2: "Organizzazione Business Travel.",
  digitalSkills:
    "Microsoft Word   |   Microsoft Excel   |   Power Point   |   Social Media   |   Outlook   |   Microsoft Powerpoint",
  languageMother: "ITALIANO",
  languagesOther: "SPAGNOLO | INGLESE | FRANCESE",
  drivingLicense: "Patente di guida : B",
  azurius: "©AZURIUS – Modeles-de-cv,com",
} as const;

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function paragraphText(block: string): string {
  return [...block.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
    .map((m) => m[1])
    .join("");
}

function rebuildParagraph(block: string, text: string): string {
  const open = block.match(/^<w:p\b[^>]*>/)?.[0] ?? "<w:p>";
  const pPr = block.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
  const safe = escapeXml(text);
  return `${open}${pPr}<w:r><w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`;
}

/** Sostituisce il testo di un paragrafo se contiene `needle`. */
function replaceParagraphNeedle(
  xml: string,
  needle: string,
  value: string,
): string {
  if (!needle || !value) return xml;
  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (block) => {
    const plain = paragraphText(block);
    if (!plain.includes(needle)) return block;
    const next = plain.split(needle).join(value);
    return rebuildParagraph(block, next);
  });
}

/** Rimuove paragrafi che contengono solo testo esempio residuo. */
function clearParagraphNeedle(xml: string, needle: string): string {
  if (!needle) return xml;
  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (block) => {
    const plain = paragraphText(block).trim();
    if (plain === needle || plain.replaceAll(needle, "").trim() === "") {
      return rebuildParagraph(block, "");
    }
    return block;
  });
}

function fillDocumentXml(xml: string, cv: EuropeanCv): string {
  const f = europeanCvDocxFields(cv);

  let out = xml;

  out = replaceParagraphNeedle(out, SAMPLE.full_name, f.full_name);
  out = replaceParagraphNeedle(out, SAMPLE.email, f.email);
  out = replaceParagraphNeedle(out, SAMPLE.linkedin, "");
  out = replaceParagraphNeedle(out, SAMPLE.phoneFormatted, f.phone);
  out = replaceParagraphNeedle(out, SAMPLE.phoneAlt, f.phone);
  out = replaceParagraphNeedle(out, SAMPLE.location, f.location);
  out = replaceParagraphNeedle(out, SAMPLE.nationality, f.nationality || "Italiana");
  out = replaceParagraphNeedle(out, SAMPLE.summary, f.summary);

  out = replaceParagraphNeedle(out, SAMPLE.educationTitle, f.education_block);
  out = clearParagraphNeedle(out, SAMPLE.educationPeriod1);
  out = clearParagraphNeedle(out, SAMPLE.educationPeriod2);
  out = clearParagraphNeedle(out, SAMPLE.educationDiploma);

  out = replaceParagraphNeedle(out, SAMPLE.work1Title, f.work_block);
  out = clearParagraphNeedle(out, SAMPLE.work1Period);
  out = clearParagraphNeedle(out, SAMPLE.work1Bullet1);
  out = clearParagraphNeedle(out, SAMPLE.work1Bullet2);
  out = clearParagraphNeedle(out, SAMPLE.work1Bullet3);
  out = clearParagraphNeedle(out, SAMPLE.work2Title);
  out = clearParagraphNeedle(out, SAMPLE.work2Period);
  out = clearParagraphNeedle(out, SAMPLE.work2Bullet1);
  out = clearParagraphNeedle(out, SAMPLE.work2Bullet2);

  out = replaceParagraphNeedle(out, SAMPLE.digitalSkills, f.digital_skills);
  out = replaceParagraphNeedle(out, SAMPLE.languageMother, f.language_mother);
  out = replaceParagraphNeedle(out, SAMPLE.languagesOther, f.languages_other);
  out = replaceParagraphNeedle(out, SAMPLE.drivingLicense, f.additional);
  out = clearParagraphNeedle(out, SAMPLE.azurius);

  return out;
}

function stillHasSampleContent(xml: string): boolean {
  const plain = paragraphText(xml);
  return (
    plain.includes(SAMPLE.full_name) ||
    plain.includes(SAMPLE.work1Title) ||
    plain.includes(SAMPLE.educationTitle)
  );
}

/** Compila il template Word Europass sostituendo i testi esempio. */
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
