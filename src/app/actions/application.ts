"use server";

import { revalidatePath } from "next/cache";

import { generateApplicationPackage } from "@/lib/ai/generate";
import type { ApplicationPackage } from "@/lib/ai/schema";
import { applyPreferenceFilter } from "@/lib/application/preference";
import { resolveCvSource } from "@/lib/cv/resolve-source";
import { pushOptimizedCvToFigma } from "@/lib/figma/safe-edit";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

export type GenerateApplicationResult =
  | {
      ok: true;
      data: ApplicationPackage;
      applicationId: string;
      cvSourceLabel: string;
      figmaWriteLabel: string;
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

  if (
    !p.figma_cv_url?.trim() &&
    !p.cv_fallback_text?.trim() &&
    p.skills.length === 0
  ) {
    return {
      ok: false,
      error:
        "Aggiungi Figma CV, CV testuale di fallback o competenze nel Profilo prima di generare.",
    };
  }

  // Figma (try) → CV testuale di fallback (catch) — mai bloccare se il fallback esiste
  let cvSource;
  try {
    cvSource = await resolveCvSource({
      figma_cv_url: p.figma_cv_url,
      cv_fallback_text: p.cv_fallback_text,
      skills: p.skills,
      job_preference: p.job_preference,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Impossibile risolvere il materiale CV.";
    return { ok: false, error: message };
  }

  let data: ApplicationPackage;
  try {
    data = await generateApplicationPackage({
      offerInput: trimmed,
      profile: {
        full_name: p.full_name,
        skills: p.skills,
        // Materiale risolto (Figma o fallback esplicito)
        cv_fallback_text: cvSource.text,
        job_preference: p.job_preference,
        companies_of_interest: p.companies_of_interest,
      },
      cvSourceKind: cvSource.kind,
      figmaError: cvSource.figmaError,
    });
    data = applyPreferenceFilter(data, p.job_preference);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Errore sconosciuto nella generazione.";
    return { ok: false, error: message };
  }

  const cvSourceLabel =
    cvSource.kind === "figma"
      ? "CV letto da Figma (originale in sola lettura)."
      : cvSource.figmaError
        ? `Usato testo CV (Figma non disponibile: ${cvSource.figmaError}).`
        : "Usato testo CV / competenze dal profilo.";

  let figmaWriteLabel =
    "Figma non configurato per la scrittura: candidatura solo in testo.";
  if (p.figma_cv_url?.trim()) {
    const write = await pushOptimizedCvToFigma({
      originalFileUrlOrKey: p.figma_cv_url,
      optimizedCvText: data.optimized_cv_text,
    });
    if (write.ok) {
      figmaWriteLabel = `CV aggiornato su Figma (working copy ${write.workingFileKey}, ${write.strategy}).`;
      data = {
        ...data,
        honesty_notes: [
          ...data.honesty_notes,
          `Figma: scrittura su working copy ${write.workingFileKey} (${write.strategy}).`,
        ],
      };
    } else if (write.skipped) {
      figmaWriteLabel = write.reason;
    } else {
      figmaWriteLabel = `Scrittura Figma fallita (candidatura testuale ok): ${write.error}`;
      data = {
        ...data,
        honesty_notes: [
          ...data.honesty_notes,
          `Figma write error: ${write.error}`,
        ],
      };
    }
  }

  const { data: row, error: insertError } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      company_name: data.company_name,
      role_title: data.role_title,
      position_type: data.position_type,
      offer_source: trimmed,
      package: data,
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError || !row) {
    return {
      ok: false,
      error:
        insertError?.message ??
        "Generazione ok, ma salvataggio in archivio fallito. Esegui la migration 002_applications.sql.",
    };
  }

  revalidatePath("/archivio");
  return {
    ok: true,
    data,
    applicationId: row.id as string,
    cvSourceLabel,
    figmaWriteLabel,
    figmaCvUrl: p.figma_cv_url?.trim() || null,
    figmaPortfolioUrl: p.figma_portfolio_url?.trim() || null,
  };
}

export async function softDeleteApplication(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };
  }

  const { error } = await supabase
    .from("applications")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/archivio");
  revalidatePath(`/archivio/${id}`);
  return { ok: true };
}
