import { describe, expect, it } from "vitest";

import type { DiscoveredOfferItem } from "@/lib/ai/discovery-schema";
import {
  buildDiscoveryAngles,
  filterNovelOffers,
  mergeDiscoveryOffers,
} from "@/lib/discovery/multi-search";

function offer(
  company: string,
  role: string,
  url: string | null = null,
): DiscoveredOfferItem {
  return {
    company_name: company,
    role_title: role,
    position_type: "lavoro",
    location: "Milano",
    source_url: url,
    snippet: "x",
    match_reason: "y",
    salary_min: null,
    salary_max: null,
    salary_source: null,
  };
}

describe("buildDiscoveryAngles", () => {
  it("splits lavoro+stage when preference is entrambi", () => {
    const angles = buildDiscoveryAngles({
      skills: ["Python"],
      job_preference: "entrambi",
      companies_of_interest: [],
    });
    expect(angles.map((a) => a.id)).toEqual(["lavoro", "stage"]);
  });

  it("adds company angle when companies are set", () => {
    const angles = buildDiscoveryAngles({
      skills: ["Python"],
      job_preference: "lavoro",
      companies_of_interest: ["Reply"],
    });
    expect(angles.map((a) => a.id)).toEqual(["lavoro", "aziende"]);
  });
});

describe("mergeDiscoveryOffers", () => {
  it("dedupes by company+role and by URL", () => {
    const merged = mergeDiscoveryOffers([
      [offer("Reply", "Engineer", "https://a.com/1"), offer("Acme", "Dev")],
      [
        offer("Reply", "Engineer", null),
        offer("Beta", "Intern", "https://a.com/1"),
      ],
    ]);
    expect(merged).toHaveLength(2);
    expect(merged.map((o) => o.company_name)).toEqual(["Reply", "Acme"]);
  });
});

describe("filterNovelOffers", () => {
  it("drops offers already seen by the user", () => {
    const novel = filterNovelOffers(
      [offer("Reply", "Engineer"), offer("NewCo", "Analyst")],
      [{ company_name: "Reply", role_title: "Engineer", source_url: null }],
    );
    expect(novel).toHaveLength(1);
    expect(novel[0]?.company_name).toBe("NewCo");
  });
});
