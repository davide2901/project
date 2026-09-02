import { describe, expect, it } from "vitest";

import { parseEuropeanCvFromText } from "@/lib/cv/parse-cv-text";

const PIRELLI_CV = `INFORMAZIONI PERSONALI
Nome: Davide Ulderico D'Aloisio
Data di nascita: 29/05/2001
Città: Bari

SINTESI
Laureato in Ingegneria Informatica e dell'Automazione con tesi focalizzata sulle architetture Cloud Serverless. Attualmente iscritto alla Laurea Magistrale in Ingegneria Informatica con specializzazione in Cybersecurity and Cloud. Ha già maturato un'esperienza di tirocinio di 6 mesi presso Pirelli Digital Solutions S.r.l., sviluppando familiarità con l'ambiente aziendale e i sistemi digitali.

ESPERIENZA LAVORATIVA

• Tirocinio
Pirelli Digital Solutions S.r.l.
16/09/2024 - 15/03/2025
- Esperienza formativa e operativa all'interno della divisione digitale di Pirelli.

• Tirocinio curriculare
Exprivia Spa
20/05/2024 - 19/06/2024
- Tirocinio formativo in ambito informatico.

• Steward (Prestazioni occasionali)
Centri congressuali di Bari
- Supporto operativo e accoglienza durante eventi e congressi.

ISTRUZIONE E FORMAZIONE

• Laurea Magistrale in Ingegneria Informatica (Cybersecurity and Cloud)
Politecnico di Bari
In corso

• Laurea in Ingegneria Informatica e dell'Automazione
Politecnico di Bari
Anno Accademico 2023/24
- Valutazione: 90/110

• Progetto Erasmus
UGR Granada, Spagna
09/2022 - 02/2023

• Diploma di Maturità Scientifica
Liceo 'Arcangelo Scacchi' di Bari
Anno Scolastico 2019/20

CAPACITÀ E COMPETENZE

• Competenze tecniche:
- Sistemi Operativi: Linux, Windows, Mac OS, iOS
- Linguaggi di Programmazione: Python, Java
- Produttività: Microsoft Office

• Competenze linguistiche:
- Italiano: Ottimo
- Inglese: Ottimo
- Spagnolo: Buono

• Patente di guida: B`;

describe("parseEuropeanCvFromText", () => {
  it("parsa CV SuMisura reale senza duplicati", () => {
    const parsed = parseEuropeanCvFromText(PIRELLI_CV);
    expect(parsed).toBeTruthy();
    expect(parsed!.full_name).toBe("Davide Ulderico D'Aloisio");
    expect(parsed!.location).toBe("Bari");
    expect(parsed!.summary).toContain("Cloud Serverless");
    expect(parsed!.work_experience).toHaveLength(3);
    expect(parsed!.work_experience[0].employer).toContain("Pirelli");
    expect(parsed!.work_experience[0].highlights[0]).toContain("Pirelli");
    expect(parsed!.education.length).toBeGreaterThanOrEqual(4);
    expect(parsed!.languages).toHaveLength(3);
    expect(parsed!.additional.some((a) => /patente/i.test(a))).toBe(true);
  });
});
