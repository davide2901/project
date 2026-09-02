import { describe, expect, it } from "vitest";

import { createOfferFingerprint } from "@/lib/application/fingerprint";

describe("createOfferFingerprint", () => {
  it("is stable for the same inputs", () => {
    const a = createOfferFingerprint("Accenture", "Junior Cloud", "offerta x");
    const b = createOfferFingerprint("Accenture", "Junior Cloud", "offerta x");
    expect(a).toBe(b);
    expect(a).toHaveLength(32);
  });

  it("changes when company or role change", () => {
    const a = createOfferFingerprint("Accenture", "Junior Cloud", "offerta");
    const b = createOfferFingerprint("Reply", "Junior Cloud", "offerta");
    expect(a).not.toBe(b);
  });
});
