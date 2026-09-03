import { describe, expect, it } from "vitest";

import { buildInterviewPrepContext } from "@/lib/ai/interview-prep-context";
import type { ApplicationPackage } from "@/lib/ai/schema";

const sample: ApplicationPackage = {
  company_name: "Exprivia Spa",
  role_title: "Junior Cybersecurity Specialist",
  position_type: "lavoro",
  ats_keywords: ["SOC"],
  matched_skills: ["Python"],
  omitted_offer_requirements: ["Certificazione ISO"],
  company_research: {
    summary: "Azienda IT con sede a Molfetta.",
    facts: [{ label: "Sede", value: "Molfetta", source: null }],
    unavailable_notes: ["Headcount"],
  },
  optimized_cv_text: "CV",
  cover_letter: "Gentile team, candidato con stage in azienda.",
  email_draft: { subject: "Candidatura", body: "Ciao" },
  honesty_notes: ["Nessuna certificazione ISO nel CV"],
};

describe("buildInterviewPrepContext", () => {
  it("include ricerca azienda, gap e lettera", () => {
    const ctx = buildInterviewPrepContext(sample);
    expect(ctx).toContain("Exprivia");
    expect(ctx).toContain("Molfetta");
    expect(ctx).toContain("Certificazione ISO");
    expect(ctx).toContain("Gentile team");
  });
});
