"use server";

import { generateApplicationPackage } from "@/lib/ai/generate";
import type { ApplicationPackage } from "@/lib/ai/schema";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

export type GenerateApplicationResult =
  | { ok: true; data: ApplicationPackage }
  | { ok: false; error: string };

export async function generateApplicationFromOffer(
  offerInput: string,
): Promise<GenerateApplicationResult> {
  const trimmed = offerInput.trim();
  if (!trimmed) {
    return { ok: false, error: "Incolla il testo o il link dell'offerta." };
  }

  if (trimmed.length > 40_000) {
    return {
      ok: false,
      error: "Testo troppo lungo. Incolla al massimo ~40.000 caratteri.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!profile) {
    return {
      ok: false,
      error: "Profilo non trovato. Completa prima la pagina Profilo.",
    };
  }

  const p = profile as Profile;

  if (!p.cv_fallback_text?.trim() && p.skills.length === 0) {
    return {
      ok: false,
      error:
        "Aggiungi almeno il CV testuale o le competenze nel Profilo prima di generare.",
    };
  }

  try {
    const data = await generateApplicationPackage({
      offerInput: trimmed,
      profile: {
        full_name: p.full_name,
        skills: p.skills,
        cv_fallback_text: p.cv_fallback_text,
        job_preference: p.job_preference,
        companies_of_interest: p.companies_of_interest,
      },
    });
    return { ok: true, data };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Errore sconosciuto nella generazione.";
    return { ok: false, error: message };
  }
}
