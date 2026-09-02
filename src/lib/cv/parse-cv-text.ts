import {
  europeanCvSchema,
  type EuropeanCv,
} from "@/lib/cv/european-cv-schema";

const SECTION_RE =
  /^(INFORMAZIONI PERSONALI|ESPERIENZA LAVORATIVA|ESPERIENZA PROFESSIONALE|ISTRUZIONE E FORMAZIONE|ISTRUZIONE|FORMAZIONE|CAPACITÀ E COMPETENZE|COMPETENZE|LINGUE|SINTESI|SINTESI PROFESSIONALE|PROFILO|INFORMAZIONI AGGIUNTIVE|ALTRE INFORMAZIONI)\s*$/i;

/**
 * Fallback per candidature già salvate senza european_cv strutturato.
 * Estrae quanto possibile dal testo plain generato in passato.
 */
export function parseEuropeanCvFromText(raw: string): EuropeanCv | null {
  const text = raw.trim();
  if (!text) return null;

  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const nomeField = text.match(/^Nome\s*:\s*(.+)$/im)?.[1]?.trim();

  let fullName = nomeField ?? "";
  let start = 0;

  const firstLine = lines[0] ?? "";
  if (
    !fullName &&
    firstLine &&
    firstLine.length < 80 &&
    !SECTION_RE.test(firstLine) &&
    !firstLine.includes(":")
  ) {
    fullName = firstLine.replace(/\s*[—–-]\s*.+$/, "").trim() || firstLine;
    start = 1;
    while (start < lines.length && lines[start] === "") start += 1;
  }

  if (!fullName) return null;

  let email: string | null = null;
  let phone: string | null = null;
  let location: string | null = null;
  let summary: string | null = null;
  const work_experience: EuropeanCv["work_experience"] = [];
  const education: EuropeanCv["education"] = [];
  const skills: string[] = [];
  const languages: EuropeanCv["languages"] = [];
  const additional: string[] = [];

  let section: "header" | "summary" | "work" | "education" | "skills" | "languages" | "additional" =
    start > 0 ? "header" : "summary";
  const summaryLines: string[] = [];
  let currentWork: EuropeanCv["work_experience"][number] | null = null;

  const flushWork = () => {
    if (currentWork) {
      work_experience.push(currentWork);
      currentWork = null;
    }
  };

  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;

    if (section === "header" && i === start && !SECTION_RE.test(line)) {
      const contactMatch = line.match(/@|\+\d|\d{3}/);
      if (contactMatch) {
        const parts = line.split(/[·|•,]/).map((p) => p.trim());
        for (const part of parts) {
          if (part.includes("@")) email = part;
          else if (/\+?\d[\d\s./-]{6,}/.test(part)) phone = part;
          else if (!location) location = part;
        }
        section = "summary";
        continue;
      }
    }

    if (SECTION_RE.test(line)) {
      flushWork();
      const upper = line.toUpperCase();
      if (/SINTESI|PROFILO/.test(upper)) section = "summary";
      else if (/ESPERIENZA/.test(upper)) section = "work";
      else if (/ISTRUZIONE|FORMAZIONE/.test(upper)) section = "education";
      else if (/COMPETENZE|CAPACIT/.test(upper)) section = "skills";
      else if (/LINGUE/.test(upper)) section = "languages";
      else if (/AGGIUNTIVE|ALTRE/.test(upper)) section = "additional";
      else section = "summary";
      continue;
    }

    if (/^([•\-*]|\d+\.)\s+/.test(line)) {
      const bullet = line.replace(/^([•\-*]|\d+\.)\s+/, "");
      if (section === "work") {
        if (!currentWork) {
          currentWork = {
            period: "",
            role: "",
            employer: "",
            highlights: [bullet],
          };
        } else {
          currentWork.highlights.push(bullet);
        }
      } else if (section === "additional") {
        additional.push(bullet);
      }
      continue;
    }

    if (section === "summary") {
      summaryLines.push(line);
      continue;
    }

    if (section === "work") {
      const parts = line.split(/[·|–—-]/).map((p) => p.trim()).filter(Boolean);
      flushWork();
      currentWork = {
        period: parts[0] ?? "",
        role: parts[1] ?? parts[0] ?? line,
        employer: parts[2] ?? "",
        highlights: [],
      };
      continue;
    }

    if (section === "education") {
      const parts = line.split(/[·|–—-]/).map((p) => p.trim()).filter(Boolean);
      education.push({
        period: parts[0] ?? "",
        qualification: parts[1] ?? line,
        institution: parts[2] ?? "",
      });
      continue;
    }

    if (section === "skills") {
      skills.push(
        ...line
          .split(/[,·;|]/)
          .map((s) => s.trim())
          .filter(Boolean),
      );
      continue;
    }

    if (section === "languages") {
      const langMatch = line.match(/^(.+?)\s*[:\-—–]\s*(.+)$/);
      if (langMatch) {
        languages.push({ language: langMatch[1].trim(), level: langMatch[2].trim() });
      } else {
        languages.push({ language: line, level: "" });
      }
      continue;
    }

    if (section === "additional") {
      additional.push(line);
    }
  }

  flushWork();
  if (summaryLines.length) summary = summaryLines.join(" ");

  const parsed = europeanCvSchema.safeParse({
    full_name: fullName,
    email,
    phone,
    location,
    summary,
    work_experience,
    education,
    skills,
    languages,
    additional,
  });

  return parsed.success ? parsed.data : null;
}

/** Risolve il CV strutturato da pacchetto (nuovo o legacy). */
export function resolveEuropeanCv(pkg: {
  european_cv?: EuropeanCv | null;
  optimized_cv_text: string;
}): EuropeanCv | null {
  if (pkg.european_cv) {
    const valid = europeanCvSchema.safeParse(pkg.european_cv);
    if (valid.success) return valid.data;
  }
  return parseEuropeanCvFromText(pkg.optimized_cv_text);
}
