import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import PizZip from "pizzip";

import { fillDocumentXml } from "@/lib/cv/europass-docx";
import { parseEuropeanCvFromText } from "@/lib/cv/parse-cv-text";

function textboxPlain(inner: string): string {
  return [...inner.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
    .map((m) => m[1])
    .join("");
}

describe("europass docx fill", () => {
  it("compila le textbox senza lasciare Maria Rossi", () => {
    const cv = parseEuropeanCvFromText(`INFORMAZIONI PERSONALI
Nome: Davide Ulderico D'Aloisio
Città: Bari

SINTESI
Profilo cyber security con focus su Cloud Serverless.

ESPERIENZA LAVORATIVA
• Tirocinio
Pirelli Digital Solutions S.r.l.
16/09/2024 - 15/03/2025
- Attività SIEM e vulnerability assessment.

ISTRUZIONE E FORMAZIONE
• Laurea Magistrale
Politecnico di Bari
In corso

CAPACITÀ E COMPETENZE
• Competenze linguistiche:
- Italiano: Ottimo
- Inglese: Ottimo`);

    expect(cv).toBeTruthy();

    const templatePath = path.join(
      process.cwd(),
      "public/templates/cv-europass-word.docx",
    );
    const zip = new PizZip(fs.readFileSync(templatePath));
    const filled = fillDocumentXml(zip.file("word/document.xml")!.asText(), cv!);

    const plain = textboxPlain(filled);
    expect(plain).toContain("Davide Ulderico D'Aloisio");
    expect(plain).toContain("Pirelli");
    expect(plain).toContain("Politecnico");
    expect(plain).not.toMatch(/Maria\s+Rossi/i);
    expect(plain).not.toContain("CARREFOUR");

    const boxes = [...filled.matchAll(/<w:txbxContent>([\s\S]*?)<\/w:txbxContent>/g)]
      .map((m) => textboxPlain(m[1]).trim())
      .filter(Boolean);
    expect(boxes.length).toBeGreaterThan(5);
  });
});
