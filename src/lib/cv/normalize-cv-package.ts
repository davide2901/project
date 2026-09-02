import type { ApplicationPackage } from "@/lib/ai/schema";
import { europeanCvToPlainText } from "@/lib/cv/european-cv-template";
import { parseEuropeanCvFromText } from "@/lib/cv/parse-cv-text";

/** Allinea european_cv e optimized_cv_text nel pacchetto candidatura. */
export function normalizeCvPackage(pkg: ApplicationPackage): ApplicationPackage {
  if (pkg.european_cv) {
    return {
      ...pkg,
      optimized_cv_text: europeanCvToPlainText(pkg.european_cv),
    };
  }
  const parsed = parseEuropeanCvFromText(pkg.optimized_cv_text);
  if (parsed) {
    return { ...pkg, european_cv: parsed };
  }
  return pkg;
}
