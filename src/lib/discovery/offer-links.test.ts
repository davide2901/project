import { describe, expect, it } from "vitest";

import {
  buildOfferSearchUrl,
  enrichOffersWithUrls,
  extractLinkFromOfferSource,
  extractUrlsFromText,
  resolveOfferLink,
} from "@/lib/discovery/offer-links";

describe("extractUrlsFromText", () => {
  it("estrae URL http/https", () => {
    expect(
      extractUrlsFromText(
        "Vedi https://careers.example.com/jobs/123 e anche http://foo.bar",
      ),
    ).toEqual(["https://careers.example.com/jobs/123", "http://foo.bar"]);
  });
});

describe("resolveOfferLink", () => {
  it("usa link diretto se presente", () => {
    const r = resolveOfferLink({
      company_name: "Acme",
      role_title: "Engineer",
      location: "Milano",
      source_url: "https://acme.com/jobs/1",
    });
    expect(r.kind).toBe("direct");
    expect(r.href).toBe("https://acme.com/jobs/1");
    expect(r.label).toBe("Vedi inserzione");
  });

  it("fallback a ricerca Google", () => {
    const r = resolveOfferLink({
      company_name: "Acme",
      role_title: "Engineer",
      location: "Milano",
      source_url: null,
    });
    expect(r.kind).toBe("search");
    expect(r.href).toContain("google.com/search");
    expect(r.href).toContain("Acme");
  });
});

describe("enrichOffersWithUrls", () => {
  it("associa URL dal testo al company match", () => {
    const offers = enrichOffersWithUrls(
      [
        {
          company_name: "Reply",
          role_title: "Software Engineer",
          position_type: "lavoro",
          location: "Torino",
          source_url: null,
          snippet: "Ruolo interessante",
          match_reason: "Match skills",
          salary_min: null,
          salary_max: null,
          salary_source: null,
        },
      ],
      {
        text: "Offerta Reply: https://reply.com/careers/software-engineer",
        groundingUrls: [
          {
            uri: "https://reply.com/careers/software-engineer",
            title: "Reply careers",
          },
        ],
      },
    );
    expect(offers[0]?.source_url).toBe(
      "https://reply.com/careers/software-engineer",
    );
  });
});

describe("extractLinkFromOfferSource", () => {
  it("legge riga Link:", () => {
    expect(
      extractLinkFromOfferSource(
        "Acme — Dev\n\nLink: https://acme.com/j/1\n\nPerché per te: ok",
      ),
    ).toBe("https://acme.com/j/1");
  });
});

describe("buildOfferSearchUrl", () => {
  it("include azienda e ruolo", () => {
    const url = buildOfferSearchUrl("Pirelli", "Data Analyst", "Milano");
    expect(decodeURIComponent(url)).toContain("Pirelli");
    expect(decodeURIComponent(url)).toContain("Data Analyst");
  });
});
