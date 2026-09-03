import { describe, expect, it } from "vitest";

import type { DiscoveredOffer } from "@/lib/types/database";
import {
  affinityScore,
  DEFAULT_OFFER_FILTERS,
  filterAndSortOffers,
  inferWorkMode,
  popularityScore,
} from "@/lib/discovery/offer-filters";

function offer(
  patch: Partial<DiscoveredOffer> & Pick<DiscoveredOffer, "id" | "role_title">,
): DiscoveredOffer {
  return {
    user_id: "u",
    company_name: "Acme",
    position_type: "lavoro",
    location: "Milano",
    source_url: null,
    snippet: "",
    match_reason: "",
    salary_min: null,
    salary_max: null,
    salary_source: null,
    status: "new",
    created_at: "2026-01-02T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...patch,
  };
}

describe("inferWorkMode", () => {
  it("classifies remote, hybrid and onsite", () => {
    expect(inferWorkMode("Remote, Italia")).toBe("remote");
    expect(inferWorkMode("Ibrido · Milano")).toBe("hybrid");
    expect(inferWorkMode("Roma")).toBe("onsite");
    expect(inferWorkMode(null)).toBe("unknown");
  });
});

describe("filterAndSortOffers", () => {
  const a = offer({
    id: "a",
    role_title: "Frontend React",
    match_reason: "React e TypeScript nel CV",
    source_url: "https://www.linkedin.com/jobs/view/1",
    salary_min: 30000,
    salary_max: 35000,
    salary_source: "stima",
    created_at: "2026-01-01T00:00:00.000Z",
  });
  const b = offer({
    id: "b",
    role_title: "Intern Python",
    position_type: "stage",
    location: "Da remoto",
    match_reason: "breve",
    salary_min: 50000,
    salary_max: 60000,
    salary_source: "annuncio",
    created_at: "2026-01-03T00:00:00.000Z",
  });
  const c = offer({
    id: "c",
    role_title: "Backend",
    location: "Ibrido, Torino",
    match_reason: "Poco allineato",
    created_at: "2026-01-04T00:00:00.000Z",
  });

  it("filters by type and work mode", () => {
    const stage = filterAndSortOffers([a, b, c], {
      ...DEFAULT_OFFER_FILTERS,
      type: "stage",
    });
    expect(stage.map((o) => o.id)).toEqual(["b"]);

    const remote = filterAndSortOffers([a, b, c], {
      ...DEFAULT_OFFER_FILTERS,
      workMode: "remote",
    });
    expect(remote.map((o) => o.id)).toEqual(["b"]);
  });

  it("sorts by RAL with missing last", () => {
    const desc = filterAndSortOffers([a, b, c], {
      ...DEFAULT_OFFER_FILTERS,
      sort: "ral_desc",
    });
    expect(desc.map((o) => o.id)).toEqual(["b", "a", "c"]);
  });

  it("sorts by popularity using job-board links and announced RAL", () => {
    expect(popularityScore(b)).toBeGreaterThan(popularityScore(c));
    expect(popularityScore(a)).toBeGreaterThan(popularityScore(c));
    const popular = filterAndSortOffers([c, a, b], {
      ...DEFAULT_OFFER_FILTERS,
      sort: "popular",
    });
    expect(popular[0].id).toBe("a");
  });

  it("sorts by affinity using profile skills", () => {
    expect(
      affinityScore(a, ["React", "TypeScript"], []),
    ).toBeGreaterThan(affinityScore(c, ["React", "TypeScript"], []));
    const ranked = filterAndSortOffers(
      [c, a],
      { ...DEFAULT_OFFER_FILTERS, sort: "affinity_desc" },
      { skills: ["React"], companiesOfInterest: [] },
    );
    expect(ranked.map((o) => o.id)).toEqual(["a", "c"]);
  });

  it("keeps only offers with a direct link", () => {
    const linked = filterAndSortOffers([a, b, c], {
      ...DEFAULT_OFFER_FILTERS,
      salary: "with_link",
    });
    expect(linked.map((o) => o.id)).toEqual(["a"]);
  });
});
