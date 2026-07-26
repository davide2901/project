/** Chiave stabile company+role per anti-duplicati offerte. */
export function offerIdentityKey(company: string, role: string): string {
  return `${company.trim().toLowerCase()}|${role.trim().toLowerCase()}`;
}

export function normalizeSourceUrl(url: string | null | undefined): string {
  const raw = url?.trim() ?? "";
  if (!raw) return "";
  try {
    const u = new URL(raw);
    u.hash = "";
    // togli trailing slash
    if (u.pathname.endsWith("/") && u.pathname.length > 1) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return raw;
  }
}

export function isDuplicateOffer(
  candidate: {
    company_name: string;
    role_title: string;
    source_url: string | null;
  },
  existing: {
    company_name: string;
    role_title: string;
    source_url: string | null;
  }[],
): boolean {
  const candUrl = normalizeSourceUrl(candidate.source_url);
  const candKey = offerIdentityKey(candidate.company_name, candidate.role_title);

  return existing.some((e) => {
    const eUrl = normalizeSourceUrl(e.source_url);
    if (candUrl && eUrl && candUrl === eUrl) return true;
    return offerIdentityKey(e.company_name, e.role_title) === candKey;
  });
}
