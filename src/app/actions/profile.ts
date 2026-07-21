"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { JobPreference } from "@/lib/types/database";

export type ProfileActionState = {
  error: string | null;
  success: boolean;
};

function parseList(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
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

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      figma_cv_url: figmaCvUrl || null,
      figma_portfolio_url: figmaPortfolioUrl || null,
      cv_fallback_text: cvFallbackText || null,
      job_preference: jobPreference,
      skills,
      companies_of_interest: companies,
    })
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/profilo");
  return { error: null, success: true };
}
