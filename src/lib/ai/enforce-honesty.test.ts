import { describe, expect, it } from "vitest";

import {
  enforcePackageHonesty,
  skillSupportedByProfile,
} from "@/lib/ai/enforce-honesty";
import type { ApplicationPackage } from "@/lib/ai/schema";

const basePkg = (): ApplicationPackage => ({
  company_name: "Acme",
  role_title: "Dev",
  position_type: "lavoro",
  ats_keywords: ["Python"],
  matched_skills: ["Python", "Kubernetes", "Teamwork"],
  omitted_offer_requirements: [],
  company_research: {
    summary: "x",
    facts: [],
    unavailable_notes: [],
  },
  optimized_cv_text: "Davide\nPython e Teamwork",
  cover_letter: "Ciao",
  email_draft: { subject: "Candidatura", body: "..." },
  honesty_notes: [],
});

describe("skillSupportedByProfile", () => {
  it("matches skills present in corpus", () => {
    const corpus = "python java teamwork";
    expect(skillSupportedByProfile("Python", corpus)).toBe(true);
    expect(skillSupportedByProfile("Kubernetes", corpus)).toBe(false);
  });
});

describe("enforcePackageHonesty", () => {
  it("drops matched skills not in profile/CV", () => {
    const out = enforcePackageHonesty(basePkg(), {
      skills: ["Python", "Teamwork"],
      cv_fallback_text: "Esperienza con Python e Teamwork",
      full_name: "Davide",
    });
    expect(out.matched_skills).toEqual(["Python", "Teamwork"]);
    expect(out.honesty_notes.some((n) => n.includes("Kubernetes"))).toBe(true);
  });
});
