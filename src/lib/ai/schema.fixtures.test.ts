import { readFileSync, readdirSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { applicationPackageSchema } from "@/lib/ai/schema";

const root = path.join(process.cwd(), "fixtures");

describe("facsimile applications", () => {
  const files = readdirSync(path.join(root, "applications")).filter((f) =>
    f.endsWith(".json"),
  );

  it("trova almeno 3 pacchetti", () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  for (const file of files) {
    it(`${file} rispetta applicationPackageSchema`, () => {
      const raw = JSON.parse(
        readFileSync(path.join(root, "applications", file), "utf8"),
      );
      const parsed = applicationPackageSchema.safeParse(raw);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    });
  }
});

describe("facsimile profile", () => {
  it("ha campi minimi", () => {
    const profile = JSON.parse(
      readFileSync(path.join(root, "profile.json"), "utf8"),
    );
    expect(profile.full_name).toBeTruthy();
    expect(profile.skills.length).toBeGreaterThan(0);
    expect(profile.cv_fallback_text.length).toBeGreaterThan(20);
  });
});
