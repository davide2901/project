"use server";

import { revalidatePath } from "next/cache";

import { toUserFacingError } from "@/lib/ai/user-facing-error";
import { createClient } from "@/lib/supabase/server";
import type { JobPreference } from "@/lib/types/database";

export type ProfileActionState = {
  error: string | null;
  success: boolean;
};

const FAKE_COMPANY_PLACEHOLDERS = new Set(
  ["acme spa", "beta studio", "roto studio"].map((s) => s.toLowerCase()),
);

function parseList(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !FAKE_COMPANY_PLACEHOLDERS.has(item.toLowerCase()));
}

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessione scaduta. Accedi di nuovo.", success: false };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const figmaCvUrl = String(formData.get("figma_cv_url") ?? "").trim();
  const figmaPortfolioUrl = String(
    formData.get("figma_portfolio_url") ?? "",
  ).trim();
  const cvFallbackText = String(formData.get("cv_fallback_text") ?? "").trim();
  const jobPreference = String(
    formData.get("job_preference") ?? "entrambi",
  ) as JobPreference;
  const skills = parseList(String(formData.get("skills") ?? ""));
  const companies = parseList(
    String(formData.get("companies_of_interest") ?? ""),
  );

  if (!["lavoro", "stage", "entrambi"].includes(jobPreference)) {
    return { error: "Preferenza non valida.", success: false };
  }

  const payload = {
    user_id: user.id,
    full_name: fullName || null,
    figma_cv_url: figmaCvUrl || null,
    figma_portfolio_url: figmaPortfolioUrl || null,
    cv_fallback_text: cvFallbackText || null,
    job_preference: jobPreference,
    skills,
    companies_of_interest: companies,
  };

  const { error } = await supabase.from("profiles").upsert(payload, {
    onConflict: "user_id",
  });

  if (error) {
    return {
      error: toUserFacingError(
        error.message,
        "Salvataggio non riuscito. Riprova tra poco.",
      ),
      success: false,
    };
  }

  revalidatePath("/profilo");
  revalidatePath("/home");
  revalidatePath("/archivio");
  return { error: null, success: true };
}
