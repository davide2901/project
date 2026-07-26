import { readFile } from "fs/promises";
import path from "path";

import {
  discoveryResultSchema,
  type DiscoveryResult,
} from "@/lib/ai/discovery-schema";
import {
  applicationPackageSchema,
  type ApplicationPackage,
} from "@/lib/ai/schema";

const FIXTURES: { match: RegExp; file: string }[] = [
  { match: /bending|spoons/i, file: "bending-spoons.json" },
  { match: /satispay|stage|tirocinio|internship/i, file: "satispay-stage.json" },
  { match: /n26|berlin|designer/i, file: "n26.json" },
];

function fixturesDir() {
  return path.join(process.cwd(), "fixtures", "applications");
}

async function loadFixture(file: string): Promise<ApplicationPackage> {
  const raw = await readFile(path.join(fixturesDir(), file), "utf8");
  const parsed = applicationPackageSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`Mock fixture non valido (${file})`);
  }
  return parsed.data;
}

/**
 * Seleziona un pacchetto facsimile in base al testo offerta.
 * Usato quando USE_AI_MOCK=true (niente chiamata Gemini).
 */
export async function mockGenerateApplicationPackage(
  offerInput: string,
): Promise<ApplicationPackage> {
  await new Promise((r) => setTimeout(r, 600));

  const hit = FIXTURES.find((f) => f.match.test(offerInput));
  const file = hit?.file ?? "bending-spoons.json";
  const pkg = await loadFixture(file);

  if (!hit) {
    return {
      ...pkg,
      company_name: pkg.company_name,
      honesty_notes: [
        ...pkg.honesty_notes,
        "Risposta MOCK: offerta non riconosciuta, usato facsimile Bending Spoons.",
      ],
    };
  }

  return {
    ...pkg,
    honesty_notes: [
      ...pkg.honesty_notes,
      "Risposta MOCK (USE_AI_MOCK=true): nessun costo Gemini.",
    ],
  };
}

export async function mockDiscoverOffers(): Promise<DiscoveryResult> {
  await new Promise((r) => setTimeout(r, 500));
  const raw = await readFile(
    path.join(process.cwd(), "fixtures", "discovery", "offers.json"),
    "utf8",
  );
  const parsed = discoveryResultSchema.safeParse({
    offers: JSON.parse(raw),
    search_notes: [
      "Risposta MOCK (USE_AI_MOCK=true): offerte da fixtures/discovery.",
    ],
  });
  if (!parsed.success) {
    throw new Error("Mock discovery fixture non valido");
  }
  return parsed.data;
}

export function isAiMockEnabled() {
  return (
    process.env.USE_AI_MOCK === "true" ||
    process.env.USE_AI_MOCK === "1" ||
    process.env.NEXT_PUBLIC_USE_AI_MOCK === "true"
  );
}
