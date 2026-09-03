"use server";

import { revalidatePath } from "next/cache";

import {
  fetchCompanyIntelFromWeb,
  intelExpiresAt,
} from "@/lib/ai/company-intel";
import type { CompanyIntelPayload } from "@/lib/ai/company-intel-schema";
import {
  companyKey,
  normalizeSalaryFields,
  roleKey,
} from "@/lib/discovery/salary";
import { createClient } from "@/lib/supabase/server";
import type { DiscoveredOffer } from "@/lib/types/database";

export type CompanyIntelResult =
  | {
      ok: true;
      payload: CompanyIntelPayload;
      cached: boolean;
      expires_at: string;
    }
  | { ok: false; error: string };

export async function getCompanyIntel(input: {
  companyName: string;
  roleTitle: string;
  location?: string | null;
  offerId?: string | null;
  forceRefresh?: boolean;
  existingContext?: string | null;
}): Promise<CompanyIntelResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };

  const cKey = companyKey(input.companyName);
  const rKey = roleKey(input.roleTitle);
  if (!cKey) return { ok: false, error: "Azienda non valida." };

  if (!input.forceRefresh) {
    const { data: cached } = await supabase
      .from("company_intel")
      .select("payload, confidence, expires_at, fetched_at")
      .eq("company_key", cKey)
      .eq("role_key", rKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached?.payload) {
      return {
        ok: true,
        payload: cached.payload as CompanyIntelPayload,
        cached: true,
        expires_at: cached.expires_at as string,
      };
    }
  }

  let payload: CompanyIntelPayload;
  try {
    payload = await fetchCompanyIntelFromWeb({
      companyName: input.companyName,
      roleTitle: input.roleTitle,
      location: input.location,
      existingContext: input.existingContext,
      forceWeb: Boolean(input.forceRefresh),
    });
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Impossibile caricare le informazioni azienda.",
    };
  }

  const expires = intelExpiresAt();
  const row = {
    company_key: cKey,
    company_name: input.companyName.trim(),
    role_key: rKey,
    role_title: input.roleTitle.trim() || null,
    payload,
    confidence: payload.confidence,
    fetched_at: new Date().toISOString(),
    expires_at: expires.toISOString(),
  };

  const { error: upsertError } = await supabase
    .from("company_intel")
    .upsert(row, { onConflict: "company_key,role_key" });

  if (upsertError) {
    console.error(
      JSON.stringify({
        scope: "company_intel",
        stage: "upsert_fail",
        error: upsertError.message,
      }),
    );
  }

  // Se l'offerta non ha RAL e l'intel ha una stima, aggiorna l'offerta
  if (input.offerId && payload.salary_hint?.min && payload.salary_hint?.max) {
    const { data: offer } = await supabase
      .from("discovered_offers")
      .select("id, salary_min, salary_source")
      .eq("id", input.offerId)
      .eq("user_id", user.id)
      .maybeSingle();

    const o = offer as Pick<
      DiscoveredOffer,
      "id" | "salary_min" | "salary_source"
    > | null;
    if (o && o.salary_min == null) {
      const salary = normalizeSalaryFields({
        salary_min: payload.salary_hint.min,
        salary_max: payload.salary_hint.max,
        salary_source: "stima",
      });
      if (salary.salary_min != null) {
        await supabase
          .from("discovered_offers")
          .update({
            salary_min: salary.salary_min,
            salary_max: salary.salary_max,
            salary_source: salary.salary_source,
          })
          .eq("id", o.id)
          .eq("user_id", user.id);
        revalidatePath("/home");
      }
    }
  }

  return {
    ok: true,
    payload,
    cached: false,
    expires_at: expires.toISOString(),
  };
}
