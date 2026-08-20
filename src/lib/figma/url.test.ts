import { describe, expect, it } from "vitest";

import { applyPreferenceFilter } from "@/lib/application/preference";
import type { ApplicationPackage } from "@/lib/ai/schema";
import { parseFigmaUrl } from "@/lib/figma/url";

const basePkg = (position_type: ApplicationPackage["position_type"]): ApplicationPackage => ({
  company_name: "Acme",
  role_title: "Junior",
  position_type,
  ats_keywords: [],
  matched_skills: [],
  omitted_offer_requirements: [],
  company_research: { summary: "", facts: [], unavailable_notes: [] },
  optimized_cv_text: "",
  cover_letter: "",
  email_draft: { subject: "", body: "" },
  honesty_notes: [],
});

describe("parseFigmaUrl", () => {
  it("estrae file key e node id", () => {
    const parsed = parseFigmaUrl(
      "https://www.figma.com/design/AbCdEf123/My-CV?node-id=12-34",
    );
    expect(parsed?.fileKey).toBe("AbCdEf123");
    expect(parsed?.nodeId).toBe("12:34");
  });
});

describe("preference filter", () => {
  it("annota mismatch lavoro vs stage", () => {
    const result = applyPreferenceFilter(basePkg("stage"), "lavoro");
    expect(result.honesty_notes.length).toBeGreaterThan(0);
    expect(result.omitted_offer_requirements.some((x) => /Mismatch/.test(x))).toBe(
      true,
    );
  });

  it("lascia passare entrambi", () => {
    const result = applyPreferenceFilter(basePkg("stage"), "entrambi");
    expect(result.honesty_notes).toEqual([]);
  });
});
