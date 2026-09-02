import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import PizZip from "pizzip";

import { parseEuropeanCvFromText } from "@/lib/cv/parse-cv-text";
import { europeanCvDocxFields } from "@/lib/cv/european-cv-template";

const SAMPLE = {
  full_name: "Maria Rossi",
  work1Title: "ASSISTENTE DI DIREZIONE – CARREFOUR",
  educationTitle:
    "LAUREA MAGISTRALE IN RELAZIONI INTERNAZIONALI – Università di Roma LA SAPIENZA",
};

function paragraphText(block: string): string {
  return [...block.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
    .map((m) => m[1])
    .join("");
}

function rebuildParagraph(block: string, text: string): string {
  const open = block.match(/^<w:p\b[^>]*>/)?.[0] ?? "<w:p>";
  const pPr = block.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
  const safe = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
  return `${open}${pPr}<w:r><w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`;
}

function replaceParagraphNeedle(
  xml: string,
  needle: string,
  value: string,
): string {
  if (!needle || !value) return xml;
  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (block) => {
    const plain = paragraphText(block);
    if (!plain.includes(needle)) return block;
    return rebuildParagraph(block, plain.split(needle).join(value));
  });
}

describe("europass docx fill", () => {
  it("sostituisce Maria Rossi con i dati candidato", () => {
    const cv = parseEuropeanCvFromText(`INFORMAZIONI PERSONALI
Nome: Davide Ulderico D'Aloisio
Città: Bari

SINTESI
Profilo cyber security.

ESPERIENZA LAVORATIVA
• Tirocinio
Pirelli Digital Solutions S.r.l.
16/09/2024 - 15/03/2025
- Attività SIEM.

ISTRUZIONE E FORMAZIONE
• Laurea Magistrale
Politecnico di Bari
In corso

CAPACITÀ E COMPETENZE
• Competenze linguistiche:
- Italiano: Ottimo`);

    expect(cv).toBeTruthy();
    const fields = europeanCvDocxFields(cv!);
    const templatePath = path.join(
      process.cwd(),
      "public/templates/cv-europass-word.docx",
    );
    const zip = new PizZip(fs.readFileSync(templatePath));
    let xml = zip.file("word/document.xml")!.asText();
    xml = replaceParagraphNeedle(xml, SAMPLE.full_name, fields.full_name);
    xml = replaceParagraphNeedle(xml, SAMPLE.work1Title, fields.work_block);
    xml = replaceParagraphNeedle(
      xml,
      SAMPLE.educationTitle,
      fields.education_block,
    );

    const plain = paragraphText(xml);
    expect(plain).toContain("Davide Ulderico D'Aloisio");
    expect(plain).toContain("Pirelli");
    expect(plain).not.toContain("CARREFOUR");
  });
});
