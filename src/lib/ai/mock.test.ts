import { describe, expect, it } from "vitest";

import { isAiMockEnabled } from "@/lib/ai/mock";

describe("isAiMockEnabled", () => {
  it("legge USE_AI_MOCK", () => {
    const prev = process.env.USE_AI_MOCK;
    process.env.USE_AI_MOCK = "true";
    expect(isAiMockEnabled()).toBe(true);
    process.env.USE_AI_MOCK = prev;
  });
});
