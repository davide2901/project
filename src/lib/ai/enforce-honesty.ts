import type { ApplicationPackage } from "@/lib/ai/schema";

type HonestyContext = {
  skills: string[];
  cv_fallback_text: string | null;
  full_name?: string | null;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9+#.\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function corpusFromProfile(ctx: HonestyContext): string {
  return normalize(
    [ctx.full_name ?? "", ...(ctx.skills ?? []), ctx.cv_fallback_text ?? ""].join(
      "\n",
    ),
  );
}

/** True se la skill è supportata dal profilo (match flessibile). */
export function skillSupportedByProfile(
  skill: string,
  corpus: string,
): boolean {
  const n = normalize(skill);
  if (!n || n.length < 2) return false;
  if (corpus.includes(n)) return true;

  // Token lunghi (≥4) tutti presenti nel corpus
  const tokens = n.split(" ").filter((t) => t.length >= 4);
  if (tokens.length >= 2 && tokens.every((t) => corpus.includes(t))) {
    return true;
  }
  if (tokens.length === 1 && corpus.includes(tokens[0])) return true;

  // Alias comuni IT/EN
  const aliases: Record<string, string[]> = {
    javascript: ["js", "ecmascript"],
    typescript: ["ts"],
    "node.js": ["nodejs", "node"],
    react: ["reactjs", "react.js"],
    "c++": ["cpp"],
    cybersecurity: ["cyber security", "sicurezza informatica"],
    teamwork: ["lavoro di squadra", "lavoro in team"],
    comunicazione: ["communication"],
  };
  for (const [canon, alts] of Object.entries(aliases)) {
    if (n === canon || alts.includes(n)) {
      if (corpus.includes(canon) || alts.some((a) => corpus.includes(a))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Filtra matched_skills non supportate e annota in honesty_notes.
 * Non altera il testo del CV (già vincolato dal prompt); rafforza la conformità.
 */
export function enforcePackageHonesty(
  pkg: ApplicationPackage,
  ctx: HonestyContext,
): ApplicationPackage {
  const corpus = corpusFromProfile(ctx);
  const kept: string[] = [];
  const dropped: string[] = [];

  for (const skill of pkg.matched_skills) {
    if (skillSupportedByProfile(skill, corpus)) {
      kept.push(skill);
    } else {
      dropped.push(skill);
    }
  }

  const honesty = [...pkg.honesty_notes];
  if (dropped.length) {
    honesty.push(
      `Rimosse dalle competenze allineate (non presenti nel profilo/CV): ${dropped.join(", ")}.`,
    );
  }

  // Se non c'è CV testuale, avvisa sempre
  if (!ctx.cv_fallback_text?.trim() && ctx.skills.length === 0) {
    honesty.push(
      "Profilo senza CV né competenze: il pacchetto può essere incompleto.",
    );
  } else if (!ctx.cv_fallback_text?.trim()) {
    honesty.push(
      "CV testuale assente: candidatura basata solo sulle competenze dichiarate.",
    );
  }

  return {
    ...pkg,
    matched_skills: kept,
    honesty_notes: Array.from(new Set(honesty)),
  };
}
