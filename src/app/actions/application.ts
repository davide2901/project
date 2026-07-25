"use server";

import { revalidatePath } from "next/cache";

import { generateApplicationPackage } from "@/lib/ai/generate";
import type { ApplicationPackage } from "@/lib/ai/schema";
import {
  offerFingerprint,
  sanitizeApplicationPackage,
} from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";
import type { Json, Profile } from "@/lib/types/database";

export type GenerateApplicationResult =
  | {
      ok: true;
      data: ApplicationPackage;
      applicationId: string | null;
      reused: boolean;
      figmaCvUrl: string | null;
      figmaPortfolioUrl: string | null;
    }
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

  const fingerprint = offerFingerprint(trimmed);

  try {
    const raw = await generateApplicationPackage({
      offerInput: trimmed,
      profile: {
        full_name: p.full_name,
        skills: p.skills,
        cv_fallback_text: p.cv_fallback_text,
        job_preference: p.job_preference,
        companies_of_interest: p.companies_of_interest,
      },
    });
    const data = sanitizeApplicationPackage(raw);

    const payload = {
      user_id: user.id,
      company_name: data.company_name,
      role_title: data.role_title,
      position_type: data.position_type,
      offer_source: trimmed.slice(0, 2000),
      offer_fingerprint: fingerprint,
      ats_keywords: data.ats_keywords,
      matched_skills: data.matched_skills,
      omitted_offer_requirements: data.omitted_offer_requirements,
      company_research: data.company_research as unknown as Json,
      optimized_cv_text: data.optimized_cv_text,
      cover_letter: data.cover_letter,
      email_subject: data.email_draft.subject,
      email_body: data.email_draft.body,
      honesty_notes: data.honesty_notes,
      status: "draft",
      deleted_at: null,
    };

    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", user.id)
      .eq("offer_fingerprint", fingerprint)
      .maybeSingle();

    let applicationId: string | null = null;
    let reused = false;

    if (existing?.id) {
      reused = true;
      const { data: updated, error: updateError } = await supabase
        .from("applications")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .single();
      if (updateError) {
        // Tabella assente o RLS: continua comunque con il risultato AI
        if (!isMissingTable(updateError)) {
          console.error("applications update:", updateError.message);
        }
      } else {
        applicationId = updated.id;
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("applications")
        .insert(payload)
        .select("id")
        .single();
      if (insertError) {
        if (!isMissingTable(insertError)) {
          console.error("applications insert:", insertError.message);
        }
      } else {
        applicationId = inserted.id;
      }
    }

    revalidatePath("/home");
    revalidatePath("/archivio");

    return {
      ok: true,
      data,
      applicationId,
      reused,
      figmaCvUrl: p.figma_cv_url,
      figmaPortfolioUrl: p.figma_portfolio_url,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Errore sconosciuto nella generazione.";
    return { ok: false, error: message };
  }
}

function isMissingTable(error: { message?: string; code?: string }) {
  const msg = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table")
  );
}
