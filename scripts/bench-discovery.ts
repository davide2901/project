import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  const key = m[1].trim();
  let val = m[2].trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  if (!(key in process.env)) process.env[key] = val;
}

async function main() {
  const { discoverOffersForProfile } = await import("../src/lib/ai/discover");
  const t0 = Date.now();
  console.log("USE_AI_MOCK=", process.env.USE_AI_MOCK);
  try {
    const r = await discoverOffersForProfile(
      {
        full_name: "Davide",
        skills: ["Python", "Cybersecurity", "Cloud"],
        cv_fallback_text: "Ingegnere informatico Python Cloud",
        job_preference: "entrambi",
        companies_of_interest: ["Reply"],
      },
      { mode: "interactive" },
    );
    console.log(
      JSON.stringify(
        {
          ms: Date.now() - t0,
          offers: r.offers.length,
          notes: (r.search_notes || []).slice(0, 4),
          first: r.offers[0]
            ? {
                company: r.offers[0].company_name,
                role: r.offers[0].role_title,
              }
            : null,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    console.error("FAIL after", Date.now() - t0, "ms", e);
    process.exit(1);
  }
}

main();
