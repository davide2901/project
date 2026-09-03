import type { SalarySource } from "@/lib/ai/discovery-schema";

export type SalaryFields = {
  salary_min: number | null;
  salary_max: number | null;
  salary_source: SalarySource | null;
};

/** Formatta RAL per card/dettaglio. Es. "38–45k" o "~38k". */
export function formatSalaryCompact(fields: SalaryFields): string | null {
  const min = fields.salary_min;
  const max = fields.salary_max;
  if (min == null || max == null || min <= 0 || max < min) return null;

  const a = Math.round(min / 1000);
  const b = Math.round(max / 1000);
  const range = a === b ? `${a}k` : `${a}–${b}k`;
  if (fields.salary_source === "stima") return `~${range}`;
  return range;
}

export function formatSalaryDetail(fields: SalaryFields): {
  amount: string;
  sourceLabel: string;
  uncertain: boolean;
} | null {
  const compact = formatSalaryCompact(fields);
  if (!compact) return null;
  if (fields.salary_source === "annuncio") {
    return {
      amount: compact,
      sourceLabel: "da annuncio",
      uncertain: false,
    };
  }
  return {
    amount: compact,
    sourceLabel: "stima (Glassdoor/mercato) · non certa",
    uncertain: true,
  };
}

export function normalizeSalaryFields(
  raw: Partial<SalaryFields> | null | undefined,
): SalaryFields {
  let min = raw?.salary_min ?? null;
  let max = raw?.salary_max ?? null;
  let source = raw?.salary_source ?? null;

  if (typeof min === "number" && typeof max !== "number") max = min;
  if (typeof max === "number" && typeof min !== "number") min = max;

  if (min != null && max != null) {
    if (min > max) [min, max] = [max, min];
    // Valori tipizzati male (es. 38 invece di 38000)
    if (max > 0 && max < 1000) {
      min = min * 1000;
      max = max * 1000;
    }
    if (min <= 0 || max > 5_000_000) {
      return { salary_min: null, salary_max: null, salary_source: null };
    }
  } else {
    return { salary_min: null, salary_max: null, salary_source: null };
  }

  if (source !== "annuncio" && source !== "stima") source = null;
  if (!source) source = "stima";

  return { salary_min: min, salary_max: max, salary_source: source };
}

export function companyKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function roleKey(role: string | null | undefined): string {
  return (role ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
