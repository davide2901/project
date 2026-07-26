import { describe, expect, it } from "vitest";

import { cvExtractSchema } from "@/lib/ai/cv-extract-schema";

describe("cvExtractSchema", () => {
  it("accetta un payload minimo valido", () => {
    const parsed = cvExtractSchema.safeParse({
      full_name: "Ada Lovelace",
      skills: ["Math", "Programming"],
      cv_fallback_text: "Ada Lovelace — analitica e programmazione.",
      companies_of_interest: [],
      job_preference: "lavoro",
    });
    expect(parsed.success).toBe(true);
  });

  it("rifiuta cv_fallback_text vuoto", () => {
    const parsed = cvExtractSchema.safeParse({
      full_name: null,
      skills: [],
      cv_fallback_text: "",
      companies_of_interest: [],
      job_preference: null,
    });
    expect(parsed.success).toBe(false);
  });
});
