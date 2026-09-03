import { describe, expect, it } from "vitest";

import {
  formatSalaryCompact,
  formatSalaryDetail,
  normalizeSalaryFields,
} from "@/lib/discovery/salary";

describe("normalizeSalaryFields", () => {
  it("scales short values like 38 to 38000", () => {
    expect(
      normalizeSalaryFields({
        salary_min: 38,
        salary_max: 45,
        salary_source: "stima",
      }),
    ).toEqual({
      salary_min: 38000,
      salary_max: 45000,
      salary_source: "stima",
    });
  });

  it("returns nulls when incomplete", () => {
    expect(
      normalizeSalaryFields({
        salary_min: null,
        salary_max: null,
        salary_source: "annuncio",
      }),
    ).toEqual({
      salary_min: null,
      salary_max: null,
      salary_source: null,
    });
  });
});

describe("formatSalaryCompact", () => {
  it("formats annuncio without tilde", () => {
    expect(
      formatSalaryCompact({
        salary_min: 38000,
        salary_max: 45000,
        salary_source: "annuncio",
      }),
    ).toBe("38–45k");
  });

  it("formats stima with tilde", () => {
    expect(
      formatSalaryCompact({
        salary_min: 40000,
        salary_max: 40000,
        salary_source: "stima",
      }),
    ).toBe("~40k");
  });
});

describe("formatSalaryDetail", () => {
  it("marks stima as uncertain", () => {
    const d = formatSalaryDetail({
      salary_min: 30000,
      salary_max: 35000,
      salary_source: "stima",
    });
    expect(d?.uncertain).toBe(true);
    expect(d?.sourceLabel).toMatch(/non certa/i);
  });
});
