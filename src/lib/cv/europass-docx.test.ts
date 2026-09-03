import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import PizZip from "pizzip";

import type { EuropeanCv } from "@/lib/cv/european-cv-schema";
import {
  fillDocumentXml,
  normalizeMatch,
  stripTrailingTemplatePages,
} from "@/lib/cv/europass-docx";

const sampleCv: EuropeanCv = {
  full_name: "Davide Ulderico D'Aloisio",
  email: "davide@example.com",
  phone: "+39 333 0000000",
  location: "Bari",
  summary: "Laureato in Ingegneria Informatica, focus Cybersecurity e Cloud.",
  work_experience: [
    {
      period: "09/2024 – 03/2025",
      role: "Tirocinio",
      employer: "Pirelli Digital Solutions",
      location: "Milano",
      highlights: ["Supporto alla divisione digitale"],
    },
  ],
  education: [
    {
      period: "In corso",
      qualification: "Laurea Magistrale in Ingegneria Informatica",
      institution: "Politecnico di Bari",
      location: "Bari",
    },
  ],
  skills: ["Python", "Linux", "Java"],
  languages: [
    { language: "Italiano", level: "Madrelingua" },
    { language: "Inglese", level: "Ottimo" },
    { language: "Spagnolo", level: "Buono" },
  ],
  additional: ["Patente B"],
};

function allTextboxPlain(xml: string): string {
  const boxes = [...xml.matchAll(/<w:txbxContent>([\s\S]*?)<\/w:txbxContent>/g)];
  return boxes
    .map((m) => {
      const inner = m[1] ?? "";
      return [...inner.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
        .map((t) => t[1] ?? "")
        .join("");
    })
    .join("\n");
}

describe("europass-docx fill", () => {
  it("normalizes curly apostrophes for matching", () => {
    expect(normalizeMatch("Supporto a 360 all\u2019Executive")).toContain(
      "all'executive",
    );
  });

  it("fills template without Nike/Office leftovers or copyright page", () => {
    const templatePath = path.join(
      process.cwd(),
      "public/templates/cv-europass-word.docx",
    );
    const buf = readFileSync(templatePath);
    const zip = new PizZip(buf);
    const xml = zip.file("word/document.xml")!.asText();

    const filled = fillDocumentXml(xml, sampleCv);
    const plain = normalizeMatch(allTextboxPlain(filled));

    expect(plain).toContain("davide ulderico");
    expect(plain).toContain("pirelli");
    expect(plain).toContain("python");
    expect(plain).toContain("inglese");
    expect(plain).toContain("bari");

    expect(plain).not.toContain("supporto a 360");
    expect(plain).not.toContain("carrefour");
    expect(plain).not.toContain("nike");
    expect(plain).not.toContain("maria rossi");
    expect(plain).not.toMatch(/microsoft word.*social media/);
    expect(plain).not.toContain("copyright - leggere");
    expect(plain).not.toContain("modelli-di-curriculum");
    // italiano non ripetuto come "altra lingua"
    expect(plain).not.toMatch(/altre lingue\s*:\s*italiano/);
  });

  it("stripTrailingTemplatePages removes content after page break", () => {
    const xml = `<w:document><w:body><w:p><w:r><w:t>CV</w:t></w:r></w:p><w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p><w:r><w:t>COPYRIGHT spam</w:t></w:r></w:p><w:p><w:r><w:drawing>keep</w:drawing></w:r></w:p><w:sectPr><w:pgSz w:w="1"/></w:sectPr></w:body></w:document>`;
    const stripped = stripTrailingTemplatePages(xml);
    expect(stripped).toContain("CV");
    expect(stripped).not.toContain("COPYRIGHT");
    expect(stripped).toContain("w:drawing");
    expect(stripped).toContain("w:sectPr");
  });
});
