import { describe, expect, it } from "vitest";

import { buildDiscoveryUserPrompt } from "@/lib/ai/discovery-prompts";

const profile = {
  full_name: "Ada",
  skills: ["TypeScript"],
  cv_fallback_text: "Dev frontend",
  job_preference: "lavoro" as const,
  companies_of_interest: ["Acme"],
};

describe("discovery prompts watchlist", () => {
  it("includes watchlist and dismissed blocks in the user prompt", () => {
    const prompt = buildDiscoveryUserPrompt(
      profile,
      [{ company_name: "SeenCo", role_title: "Dev" }],
      {
        watchlist: [{ company_name: "WatchCo", role_title: "Designer" }],
        dismissed: [{ company_name: "NoCo", role_title: "Intern" }],
      },
    );
    expect(prompt).toContain("WatchCo");
    expect(prompt).toContain("LISTA DA TENERE D'OCCHIO");
    expect(prompt).toContain("OFFERTE SCARTATE");
    expect(prompt).toContain("NoCo");
    expect(prompt).toContain("Aziende di interesse: Acme, WatchCo");
  });

  it("includes preferred locations in the user prompt", () => {
    const prompt = buildDiscoveryUserPrompt({
      ...profile,
      preferred_locations: ["Milano", "Remoto"],
    });
    expect(prompt).toContain("Luoghi preferiti: Milano, Remoto");
  });
});
