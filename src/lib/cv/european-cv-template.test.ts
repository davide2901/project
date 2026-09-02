import { describe, expect, it } from "vitest";

import {
  buildCvPrintHtml,
  europeanCvToPlainText,
  renderEuropeanCvHtml,
} from "@/lib/cv/european-cv-template";
import { parseEuropeanCvFromText } from "@/lib/cv/parse-cv-text";
import { normalizeCvPackage } from "@/lib/cv/normalize-cv-package";
import { applicationPackageSchema } from "@/lib/ai/schema";
import { readFileSync } from "fs";
import path from "path";

const sampleCv = {
  full_name: "Davide Test",
  email: "davide@example.com",
  phone: "+39 333 1234567",
  location: "Milano",
  summary: "Sviluppatore frontend con React e TypeScript.",
  work_experience: [
    {
      period: "01/2024 – oggi",
      role: "Frontend Developer",
      employer: "Pirelli Digital Solutions",
      location: "Milano",
      highlights: [
        "Sviluppo componenti React per dashboard interne",
        "Integrazione API REST e autenticazione",
      ],
    },
  ],
  education: [
    {
      period: "2020 – 2024",
      qualification: "Laurea magistrale Ingegneria Informatica",
      institution: "Politecnico di Milano",
      location: "Milano",
    },
  ],
  skills: ["React", "TypeScript", "Next.js"],
  languages: [{ language: "Italiano", level: "Madrelingua" }],
  additional: [],
};

describe("european cv template", () => {
  it("renderizza sezioni strutturate", () => {
    const html = renderEuropeanCvHtml(sampleCv);
    expect(html).toContain("Davide Test");
    expect(html).toContain("Esperienza lavorativa");
    expect(html).toContain("Pirelli Digital Solutions");
    expect(html).toContain("cv-skill");
  });

  it("genera HTML stampabile completo", () => {
    const doc = buildCvPrintHtml(sampleCv, "CV test");
    expect(doc).toContain("<!doctype html>");
    expect(doc).toContain("cv-header");
  });

  it("converte in testo plain con sezioni", () => {
    const text = europeanCvToPlainText(sampleCv);
    expect(text).toMatch(/^Davide Test/m);
    expect(text).toContain("ESPERIENZA LAVORATIVA");
    expect(text).toContain("React");
  });
});

describe("parseEuropeanCvFromText", () => {
  it("estrae nome e sintesi da testo legacy", () => {
    const parsed = parseEuropeanCvFromText(
      "Davide Test\nMilano · davide@example.com\n\nSINTESI PROFESSIONALE\nProfilo cyber security.\n\nESPERIENZA LAVORATIVA\n01/2024 – oggi · Analyst · Pirelli\n• Monitoraggio SIEM",
    );
    expect(parsed?.full_name).toBe("Davide Test");
    expect(parsed?.summary).toContain("Profilo cyber security");
    expect(parsed?.work_experience[0]?.employer).toBeTruthy();
  });
});

describe("normalizeCvPackage", () => {
  it("allinea optimized_cv_text da european_cv", () => {
    const fixture = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "fixtures/applications/bending-spoons.json"),
        "utf8",
      ),
    );
    const pkg = applicationPackageSchema.parse(fixture);
    const normalized = normalizeCvPackage(pkg);
    expect(normalized.european_cv).toBeTruthy();
    expect(normalized.optimized_cv_text).toContain("Davide Test");
    expect(normalized.optimized_cv_text).toContain("ESPERIENZA LAVORATIVA");
  });
});
