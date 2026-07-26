"use server";

import { revalidatePath } from "next/cache";
import { readFile } from "fs/promises";
import path from "path";

import { applicationPackageSchema } from "@/lib/ai/schema";
import { createClient } from "@/lib/supabase/server";
import type { JobPreference } from "@/lib/types/database";

const FIXTURE_APPS = [
  "bending-spoons.json",
  "satispay-stage.json",
  "n26.json",
] as const;

const OFFER_BY_APP: Record<(typeof FIXTURE_APPS)[number], string> = {
  "bending-spoons.json": "bending-spoons.txt",
  "satispay-stage.json": "satispay-stage.txt",
  "n26.json": "n26.txt",
};

function fixturesRoot() {
  return path.join(process.cwd(), "fixtures");
}

async function readFixture(rel: string) {
  return readFile(path.join(fixturesRoot(), rel), "utf8");
}

export type LoadFacsimilesResult =
  | { ok: true; profileUpdated: boolean; inserted: number }
  | { ok: false; error: string };

/**
 * Carica profilo + 3 candidature facsimile nell'account corrente.
 * Solo in development (protezione anti-abuso in produzione).
 */
export async function loadFacsimilesIntoAccount(): Promise<LoadFacsimilesResult> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "I facsimile sono disponibili solo in development." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Accedi prima di caricare i facsimile." };
  }

  let profileJson: {
    full_name: string;
    skills: string[];
    cv_fallback_text: string;
    job_preference: JobPreference;
    companies_of_interest: string[];
  };

  try {
    profileJson = JSON.parse(await readFixture("profile.json"));
  } catch {
    return { ok: false, error: "Impossibile leggere fixtures/profile.json" };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: profileJson.full_name,
      skills: profileJson.skills,
      cv_fallback_text: profileJson.cv_fallback_text,
      job_preference: profileJson.job_preference,
      companies_of_interest: profileJson.companies_of_interest,
    })
    .eq("user_id", user.id);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  let inserted = 0;

  for (const appFile of FIXTURE_APPS) {
    const raw = await readFixture(`applications/${appFile}`);
    const parsed = applicationPackageSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return {
        ok: false,
        error: `Facsimile non valido (${appFile}): ${parsed.error.issues[0]?.message}`,
      };
    }

    const offer = await readFixture(`offers/${OFFER_BY_APP[appFile]}`);
    const pkg = parsed.data;

    const { error } = await supabase.from("applications").insert({
      user_id: user.id,
      company_name: pkg.company_name,
      role_title: pkg.role_title,
      position_type: pkg.position_type,
      offer_source: offer.trim(),
      package: pkg,
      status: "draft",
    });

    if (error) {
      return { ok: false, error: `${appFile}: ${error.message}` };
    }
    inserted += 1;
  }

  revalidatePath("/profilo");
  revalidatePath("/archivio");
  revalidatePath("/candidatura/nuova");

  return { ok: true, profileUpdated: true, inserted };
}
