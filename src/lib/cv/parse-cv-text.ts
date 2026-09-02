import {
  europeanCvSchema,
  type EuropeanCv,
} from "@/lib/cv/european-cv-schema";

const SECTION_RE =
  /^(INFORMAZIONI PERSONALI|ESPERIENZA LAVORATIVA|ESPERIENZA PROFESSIONALE|ISTRUZIONE E FORMAZIONE|ISTRUZIONE|FORMAZIONE|CAPACITÀ E COMPETENZE|CAPACITA E COMPETENZE|COMPETENZE|LINGUE|SINTESI|SINTESI PROFESSIONALE|PROFILO|INFORMAZIONI AGGIUNTIVE|ALTRE INFORMAZIONI)\s*$/i;

function isSection(line: string): boolean {
  return SECTION_RE.test(line.trim());
}

function sectionKind(line: string):
  | "personal"
  | "summary"
  | "work"
  | "education"
  | "skills"
  | "languages"
  | "additional"
  | "other" {
  const upper = line.toUpperCase();
  if (/INFORMAZIONI PERSONALI/.test(upper)) return "personal";
  if (/SINTESI|PROFILO/.test(upper)) return "summary";
  if (/ESPERIENZA/.test(upper)) return "work";
  if (/ISTRUZIONE|FORMAZIONE/.test(upper)) return "education";
  if (/COMPETENZE|CAPACIT/.test(upper)) return "skills";
  if (/LINGUE/.test(upper)) return "languages";
  if (/AGGIUNTIVE|ALTRE/.test(upper)) return "additional";
  return "other";
}

function parseField(line: string): { key: string; value: string } | null {
  const m = line.match(/^([^:]+):\s*(.+)$/);
  if (!m) return null;
  return { key: m[1].trim().toLowerCase(), value: m[2].trim() };
}

function isMainBullet(line: string): boolean {
  return /^[•*]\s+/.test(line) || /^\d+\.\s+/.test(line);
}

function isSubBullet(line: string): boolean {
  return /^-\s+/.test(line);
}

function mainBulletText(line: string): string {
  return line.replace(/^[•*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
}

function isDateLine(line: string): boolean {
  return /\d{2}\/\d{4}|\d{4}\s*[-–—]\s*\d{2}\/\d{4}|\d{4}\s*[-–—]\s*\d{4}|in corso|anno accademico|anno scolastico/i.test(
    line,
  );
}

function dedupeEntries<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Fallback per candidature senza european_cv strutturato.
 * Parser dedicato al formato plain generato da SuMisura (sezioni MAIUSCOLO + bullet).
 */
export function parseEuropeanCvFromText(raw: string): EuropeanCv | null {
  const text = raw.trim();
  if (!text) return null;

  const lines = text.split(/\r?\n/).map((l) => l.trim());

  let fullName = text.match(/^Nome\s*:\s*(.+)$/im)?.[1]?.trim() ?? "";
  let email: string | null = null;
  let phone: string | null = null;
  let location: string | null = null;
  let birthDate: string | null = null;
  let summary: string | null = null;

  const work_experience: EuropeanCv["work_experience"] = [];
  const education: EuropeanCv["education"] = [];
  const skills: string[] = [];
  const languages: EuropeanCv["languages"] = [];
  const additional: string[] = [];

  let section: ReturnType<typeof sectionKind> = "other";
  const summaryLines: string[] = [];

  let workDraft: {
    role: string;
    employer: string;
    period: string;
    highlights: string[];
  } | null = null;

  let eduDraft: {
    qualification: string;
    institution: string;
    period: string;
    details: string[];
  } | null = null;

  const flushWork = () => {
    if (!workDraft) return;
    const { role, employer, period, highlights } = workDraft;
    if (role || employer) {
      work_experience.push({
        period: period || "",
        role: role || employer,
        employer: employer || role,
        highlights: highlights.slice(0, 4),
      });
    }
    workDraft = null;
  };

  const flushEducation = () => {
    if (!eduDraft) return;
    const { qualification, institution, period, details } = eduDraft;
    if (qualification || institution) {
      education.push({
        period: period || "",
        qualification,
        institution,
        location: null,
      });
      if (details.length) {
        additional.push(...details.slice(0, 2));
      }
    }
    eduDraft = null;
  };

  for (const line of lines) {
    if (!line) continue;

    if (isSection(line)) {
      flushWork();
      flushEducation();
      section = sectionKind(line);
      continue;
    }

    if (section === "personal") {
      const field = parseField(line);
      if (field) {
        if (field.key.startsWith("nome")) fullName = field.value;
        else if (field.key.includes("citt")) location = field.value;
        else if (field.key.includes("email")) email = field.value;
        else if (field.key.includes("telefono") || field.key.includes("cellulare"))
          phone = field.value;
        else if (field.key.includes("nascita")) birthDate = field.value;
      }
      continue;
    }

    if (section === "summary") {
      summaryLines.push(line);
      continue;
    }

    if (section === "work") {
      if (isSubBullet(line) && workDraft) {
        workDraft.highlights.push(line.slice(2).trim());
        continue;
      }

      if (isMainBullet(line)) {
        flushWork();
        workDraft = {
          role: mainBulletText(line),
          employer: "",
          period: "",
          highlights: [],
        };
        continue;
      }

      if (!workDraft) {
        workDraft = { role: line, employer: "", period: "", highlights: [] };
        continue;
      }

      if (line.startsWith("- ")) {
        workDraft.highlights.push(line.slice(2).trim());
        continue;
      }

      if (isDateLine(line) && !workDraft.period) {
        workDraft.period = line.replace(/\s+/g, " ");
        continue;
      }

      if (!workDraft.employer) {
        workDraft.employer = line;
        continue;
      }

      workDraft.highlights.push(line);
      continue;
    }

    if (section === "education") {
      if (isSubBullet(line) && eduDraft) {
        eduDraft.details.push(line.slice(2).trim());
        continue;
      }

      if (isMainBullet(line)) {
        flushEducation();
        eduDraft = {
          qualification: mainBulletText(line),
          institution: "",
          period: "",
          details: [],
        };
        continue;
      }

      if (!eduDraft) {
        eduDraft = {
          qualification: line,
          institution: "",
          period: "",
          details: [],
        };
        continue;
      }

      if (line.startsWith("- ")) {
        eduDraft.details.push(line.slice(2).trim());
        continue;
      }

      if (isDateLine(line) && !eduDraft.period) {
        eduDraft.period = line;
        continue;
      }

      if (!eduDraft.institution) {
        eduDraft.institution = line;
        continue;
      }

      eduDraft.details.push(line);
      continue;
    }

    if (section === "skills") {
      if (isMainBullet(line)) {
        const item = mainBulletText(line);
        if (/linguist/i.test(item)) {
          section = "languages";
          continue;
        }
        if (/patente/i.test(item)) {
          additional.push(item);
          continue;
        }
        if (/tecnic/i.test(item)) continue;
        skills.push(item.replace(/:$/, ""));
        continue;
      }

      if (isSubBullet(line)) {
        const inner = line.slice(2).trim();
        if (/patente/i.test(inner)) {
          additional.push(inner);
          continue;
        }
        skills.push(inner);
        continue;
      }

      continue;
    }

    if (section === "languages") {
      if (isSubBullet(line)) {
        const inner = line.slice(2).trim();
        const lang = parseField(inner);
        if (lang) languages.push({ language: lang.key, level: lang.value });
        continue;
      }
      if (isMainBullet(line)) {
        const item = mainBulletText(line);
        if (/patente/i.test(item)) {
          additional.push(item);
          section = "skills";
        }
        continue;
      }
      const field = parseField(line);
      if (field) {
        languages.push({ language: field.key, level: field.value });
      }
      continue;
    }

    if (section === "additional") {
      additional.push(isMainBullet(line) ? mainBulletText(line) : line);
    }
  }

  flushWork();
  flushEducation();

  if (summaryLines.length) {
    summary = summaryLines.join(" ");
  }

  if (!fullName) {
    const first = lines.find((l) => l && !isSection(l) && !l.includes(":"));
    if (first) fullName = first.replace(/\s*[—–-]\s*.+$/, "").trim();
  }

  if (!fullName) return null;

  if (birthDate && !additional.some((a) => a.includes(birthDate))) {
    additional.unshift(`Data di nascita: ${birthDate}`);
  }

  const normalizedLanguages = languages.map((l) => ({
    language: l.language.charAt(0).toUpperCase() + l.language.slice(1),
    level: l.level,
  }));

  const parsed = europeanCvSchema.safeParse({
    full_name: fullName,
    email,
    phone,
    location,
    summary,
    work_experience: dedupeEntries(
      work_experience,
      (w) => `${w.role}|${w.employer}|${w.period}`,
    ),
    education: dedupeEntries(
      education.filter((e) => e.institution.trim()),
      (e) => `${e.qualification}|${e.institution}|${e.period}`,
    ),
    skills: [...new Set(skills.filter(Boolean))],
    languages: normalizedLanguages,
    additional: [...new Set(additional.filter(Boolean))],
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
