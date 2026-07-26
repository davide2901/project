"use server";

import { revalidatePath } from "next/cache";

import { generateApplicationFromOffer } from "@/app/actions/application";
import { discoverOffersForProfile } from "@/lib/ai/discover";
import { isDuplicateOffer } from "@/lib/discovery/dedupe";
import { createClient } from "@/lib/supabase/server";
import type { DiscoveredOffer, Profile } from "@/lib/types/database";

export type RunDiscoveryResult =
  | { ok: true; inserted: number; notes: string[]; removedDuplicates: number }
  | { ok: false; error: string };

export type StartFromOfferResult =
  | { ok: true; applicationId: string }
  | { ok: false; error: string };

function profileReady(p: Profile): boolean {
  return (
    p.skills.length > 0 ||
    Boolean(p.cv_fallback_text?.trim()) ||
    Boolean(p.figma_cv_url?.trim())
  );
}

/** Chiude i duplicati già in lista (stessa company+role o stessa URL). */
async function dismissExistingDuplicates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from("discovered_offers")
    .select("id, company_name, role_title, source_url, created_at")
    .eq("user_id", userId)
    .eq("status", "new")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Pick<
    DiscoveredOffer,
    "id" | "company_name" | "role_title" | "source_url" | "created_at"
  >[];

  const keep = new Set<string>();
  const toDismiss: string[] = [];
  const seen: {
    company_name: string;
    role_title: string;
    source_url: string | null;
  }[] = [];

  for (const row of rows) {
    if (isDuplicateOffer(row, seen)) {
      toDismiss.push(row.id);
      continue;
    }
    seen.push(row);
    keep.add(row.id);
  }

  if (toDismiss.length === 0) return 0;

  const { error } = await supabase
    .from("discovered_offers")
    .update({ status: "dismissed" })
    .eq("user_id", userId)
    .in("id", toDismiss);

  if (error) return 0;
  return toDismiss.length;
}

export async function runDiscovery(): Promise<RunDiscoveryResult> {
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

  if (error) return { ok: false, error: error.message };
  if (!profile) {
    return { ok: false, error: "Profilo non trovato. Completa prima Profilo." };
  }

  const p = profile as Profile;
  if (!profileReady(p)) {
    return {
      ok: false,
      error:
        "Completa il profilo (competenze o CV) prima di cercare offerte.",
    };
  }

  const removedDuplicates = await dismissExistingDuplicates(supabase, user.id);

  let result;
  try {
    result = await discoverOffersForProfile({
      full_name: p.full_name,
      skills: p.skills,
      cv_fallback_text: p.cv_fallback_text,
      job_preference: p.job_preference,
      companies_of_interest: p.companies_of_interest,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Discovery fallita.",
    };
  }

  const { data: existing } = await supabase
    .from("discovered_offers")
    .select("company_name, role_title, source_url")
    .eq("user_id", user.id)
    .neq("status", "dismissed");

  const existingRows = (existing ?? []) as Pick<
    DiscoveredOffer,
    "company_name" | "role_title" | "source_url"
  >[];

  let inserted = 0;
  for (const offer of result.offers) {
    if (isDuplicateOffer(offer, existingRows)) continue;

    const { error: insertError } = await supabase
      .from("discovered_offers")
      .insert({
        user_id: user.id,
        company_name: offer.company_name,
        role_title: offer.role_title,
        position_type: offer.position_type,
        location: offer.location,
        source_url: offer.source_url,
        snippet: offer.snippet,
        match_reason: offer.match_reason,
        status: "new",
      });

    if (!insertError) {
      inserted += 1;
      existingRows.push({
        company_name: offer.company_name,
        role_title: offer.role_title,
        source_url: offer.source_url,
      });
    }
  }

  revalidatePath("/home");
  return {
    ok: true,
    inserted,
    removedDuplicates,
    notes: result.search_notes,
  };
}

export async function dismissOffer(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };

  const { error } = await supabase
    .from("discovered_offers")
    .update({ status: "dismissed" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/home");
  return { ok: true };
}

export async function startApplicationFromOffer(
  id: string,
): Promise<StartFromOfferResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };

  const { data: offer, error } = await supabase
    .from("discovered_offers")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!offer) return { ok: false, error: "Offerta non trovata." };

  const row = offer as DiscoveredOffer;
  const offerText = [
    `${row.company_name} — ${row.role_title}`,
    row.location ? `Luogo: ${row.location}` : null,
    `Tipo: ${row.position_type}`,
    row.snippet,
    row.source_url ? `Link: ${row.source_url}` : null,
    row.match_reason ? `Perché per te: ${row.match_reason}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const generated = await generateApplicationFromOffer(offerText);
  if (!generated.ok) return generated;

  await supabase
    .from("discovered_offers")
    .update({ status: "applied" })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/home");
  revalidatePath("/archivio");
  return { ok: true, applicationId: generated.applicationId };
}

/** Usato dal cron: discovery per un profilo già caricato (service role). */
export async function runDiscoveryForUserId(
  userId: string,
  profile: Profile,
): Promise<{ inserted: number; error?: string }> {
  if (!profileReady(profile)) {
    return { inserted: 0, error: "profilo incompleto" };
  }

  const { createServiceClient } = await import("@/lib/supabase/admin");
  const supabase = createServiceClient();

  let result;
  try {
    result = await discoverOffersForProfile({
      full_name: profile.full_name,
      skills: profile.skills,
      cv_fallback_text: profile.cv_fallback_text,
      job_preference: profile.job_preference,
      companies_of_interest: profile.companies_of_interest,
    });
  } catch (err) {
    return {
      inserted: 0,
      error: err instanceof Error ? err.message : "discovery failed",
    };
  }

  const { data: existing } = await supabase
    .from("discovered_offers")
    .select("company_name, role_title, source_url")
    .eq("user_id", userId)
    .neq("status", "dismissed");

  const existingRows = (existing ?? []) as Pick<
    DiscoveredOffer,
    "company_name" | "role_title" | "source_url"
  >[];

  let inserted = 0;
  for (const offer of result.offers) {
    if (isDuplicateOffer(offer, existingRows)) continue;

    const { error: insertError } = await supabase
      .from("discovered_offers")
      .insert({
        user_id: userId,
        company_name: offer.company_name,
        role_title: offer.role_title,
        position_type: offer.position_type,
        location: offer.location,
        source_url: offer.source_url,
        snippet: offer.snippet,
        match_reason: offer.match_reason,
        status: "new",
      });

    if (!insertError) {
      inserted += 1;
      existingRows.push({
        company_name: offer.company_name,
        role_title: offer.role_title,
        source_url: offer.source_url,
      });
    }
  }

  return { inserted };
}
