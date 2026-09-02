import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import type { EuropeanCv } from "@/lib/cv/european-cv-schema";
import { europeanCvDocxFields } from "@/lib/cv/european-cv-template";

const TEMPLATE_URL = "/templates/cv-europass-template.docx";

/** Compila il template Word Europass e restituisce un Blob .docx. */
export async function generateEuropassDocx(cv: EuropeanCv): Promise<Blob> {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) {
    throw new Error("Template Europass non trovato. Ricarica la pagina.");
  }

  const buffer = await res.arrayBuffer();
  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render({
    ...europeanCvDocxFields(cv),
    linkedin: "",
  });

  const out = doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return out as Blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
