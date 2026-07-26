"use server";

import { extractCvFromDocument } from "@/lib/ai/extract-cv";
import type { CvExtract } from "@/lib/ai/cv-extract-schema";
import { createClient } from "@/lib/supabase/server";
import type { JobPreference } from "@/lib/types/database";

export type ParseCvState = {
  error: string | null;
  extract: CvExtract | null;
};

export async function parseCvUpload(
  _prev: ParseCvState,
  formData: FormData,
): Promise<ParseCvState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessione scaduta. Accedi di nuovo.", extract: null };
  }

  const file = formData.get("cv_file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Seleziona un file PDF, DOCX o immagine.", extract: null };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const extract = await extractCvFromDocument({
      bytes,
      mimeType: file.type || "application/octet-stream",
      fileName: file.name || "cv",
    });
    return { error: null, extract };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Analisi CV non riuscita.";
    return { error: message, extract: null };
  }
}

export type ApplyExtractedProfileState = {
  error: string | null;
  success: boolean;
};

/** Opzionale: salva subito sul profilo i campi estratti. */
export async function applyExtractedProfile(
  extract: CvExtract,
): Promise<ApplyExtractedProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessione scaduta. Accedi di nuovo.", success: false };
  }

  const jobPreference = (extract.job_preference ??
    "entrambi") as JobPreference;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: extract.full_name,
      skills: extract.skills,
      cv_fallback_text: extract.cv_fallback_text,
      companies_of_interest: extract.companies_of_interest,
      job_preference: jobPreference,
    })
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}
