import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { discoveryResultSchema } from "@/lib/ai/discovery-schema";

describe("discovery fixtures", () => {
  it("offers.json matches discovery schema", () => {
    const offers = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "fixtures", "discovery", "offers.json"),
        "utf8",
      ),
    );
    const parsed = discoveryResultSchema.safeParse({
      offers,
      search_notes: ["test"],
    });
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    if (parsed.success) {
      expect(parsed.data.offers.length).toBeGreaterThan(0);
    }
  });
});
