import { describe, expect, it } from "vitest";
import PizZip from "pizzip";

import type { EuropeanCv } from "@/lib/cv/european-cv-schema";
import { generateEuropassDocx, normalizeMatch } from "@/lib/cv/europass-docx";

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

function docxPlainText(buffer: ArrayBuffer): string {
  const zip = new PizZip(buffer);
  const xml = zip.file("word/document.xml")!.asText();
  return [...xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
    .map((m) => m[1] ?? "")
    .join(" ");
}

describe("europass-docx generate", () => {
  it("normalizes curly apostrophes for matching", () => {
    expect(normalizeMatch("Supporto a 360 all\u2019Executive")).toContain(
      "all'executive",
    );
  });

  it("builds a clean single-section Europass without template junk", async () => {
    const blob = await generateEuropassDocx(sampleCv);
    const buffer = await blob.arrayBuffer();
    const zip = new PizZip(buffer);
    const xml = zip.file("word/document.xml")!.asText();
    const plain = normalizeMatch(docxPlainText(buffer));

    expect(plain).toContain("davide ulderico");
    expect(plain).toContain("pirelli");
    expect(plain).toContain("python");
    expect(plain).toContain("inglese");
    expect(plain).toContain("bari");
    expect(plain).toContain("presentazione");

    expect(plain).not.toContain("maria rossi");
    expect(plain).not.toContain("nike");
    expect(plain).not.toContain("carrefour");
    expect(plain).not.toContain("modelli-di-curriculum");
    expect(plain).not.toContain("scopri altri");
    expect(plain).not.toContain("azurius");
    expect(xml).not.toMatch(/w:type="page"/);
    expect(xml.toLowerCase()).not.toContain("image1");
  });

  it("does not repeat mother tongue under other languages", async () => {
    const blob = await generateEuropassDocx(sampleCv);
    const plain = normalizeMatch(docxPlainText(await blob.arrayBuffer()));
    expect(plain).toMatch(/lingua madre:\s*italiano/);
    expect(plain).not.toMatch(/altre lingue:.*italiano/);
  });
});
