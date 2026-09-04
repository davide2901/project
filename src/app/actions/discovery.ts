"use server";

import { revalidatePath } from "next/cache";

import { generateApplicationFromOffer } from "@/app/actions/application";
import { discoverOffersForProfile } from "@/lib/ai/discover";
import {
  DISCOVERY_ERROR_FALLBACK,
  toUserFacingError,
} from "@/lib/ai/user-facing-error";
import { isDuplicateOffer } from "@/lib/discovery/dedupe";
import { resolveOfferLink } from "@/lib/discovery/offer-links";
import { createClient } from "@/lib/supabase/server";
import type { DiscoveredOffer, Profile } from "@/lib/types/database";

export type RunDiscoveryResult =
  | {
      ok: true;
      inserted: number;
      skipped: number;
      notes: string[];
      removedDuplicates: number;
      degraded?: "quota" | "no_grounding";
    }
  | { ok: false; error: string };

export type StartFromOfferResult =
  | { ok: true; applicationId: string }
  | { ok: false; error: string };

function profileReady(p: Profile): boolean {
  return (
    p.skills.length > 0 || Boolean(p.cv_fallback_text?.trim())
  );
}

function offerHistoryRefs(
  rows: Pick<
    DiscoveredOffer,
    "company_name" | "role_title" | "source_url" | "status"
  >[],
) {
  return {
    existingRows: rows.map((o) => ({
      company_name: o.company_name,
      role_title: o.role_title,
      source_url: o.source_url,
    })),
    seen: rows.map((o) => ({
      company_name: o.company_name,
      role_title: o.role_title,
    })),
    watchlist: rows
      .filter((o) => o.status === "watching")
      .map((o) => ({
        company_name: o.company_name,
        role_title: o.role_title,
      })),
    dismissed: rows
      .filter((o) => o.status === "dismissed")
      .map((o) => ({
        company_name: o.company_name,
        role_title: o.role_title,
      })),
  };
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
    .delete()
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

  const { data: history } = await supabase
    .from("discovered_offers")
    .select("company_name, role_title, source_url, status")
    .eq("user_id", user.id);

  const historyRows = (history ?? []) as Pick<
    DiscoveredOffer,
    "company_name" | "role_title" | "source_url" | "status"
  >[];
  const { existingRows, seen, watchlist, dismissed } =
    offerHistoryRefs(historyRows);

  let result;
  try {
    console.info(
      JSON.stringify({
        scope: "discovery",
        stage: "runDiscovery_start",
        userId: user.id,
        seen: existingRows.length,
        t: Date.now(),
      }),
    );
    result = await discoverOffersForProfile(
      {
        full_name: p.full_name,
        skills: p.skills,
        cv_fallback_text: p.cv_fallback_text,
        job_preference: p.job_preference,
        companies_of_interest: p.companies_of_interest,
        preferred_locations: p.preferred_locations ?? [],
        seen_offers: seen,
        watchlist,
        dismissed,
      },
      { mode: "interactive", allowRefresh: true },
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        scope: "discovery",
        stage: "runDiscovery_error",
        userId: user.id,
        error: err instanceof Error ? err.message.slice(0, 300) : "unknown",
        t: Date.now(),
      }),
    );
    return {
      ok: false,
      error: toUserFacingError(err, DISCOVERY_ERROR_FALLBACK),
    };
  }

  let inserted = 0;
  let skipped = 0;
  for (const offer of result.offers) {
    if (isDuplicateOffer(offer, existingRows)) {
      skipped += 1;
      continue;
    }

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
        salary_min: offer.salary_min,
        salary_max: offer.salary_max,
        salary_source: offer.salary_source,
        status: "new",
      });

    if (!insertError) {
      inserted += 1;
      existingRows.push({
        company_name: offer.company_name,
        role_title: offer.role_title,
        source_url: offer.source_url,
      });
    } else {
      skipped += 1;
    }
  }

  if (inserted === 0 && result.degraded === "quota") {
    return {
      ok: false,
      error:
        "Limite Google Search Gemini raggiunto (quota). Attendi il reset o abilita billing su AI Studio, poi riprova. Non è un problema di offerte già presenti.",
    };
  }

  revalidatePath("/home");
  return {
    ok: true,
    inserted,
    skipped,
    removedDuplicates,
    notes: result.search_notes,
    degraded: result.degraded,
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

export async function setOfferWatching(
  id: string,
  watching: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessione scaduta. Accedi di nuovo." };

  const { error } = await supabase
    .from("discovered_offers")
    .update({ status: watching ? "watching" : "new" })
    .eq("id", id)
    .eq("user_id", user.id)
    .in("status", watching ? ["new", "watching"] : ["watching", "new"]);

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
  const link = resolveOfferLink(row);
  const salary =
    row.salary_min != null && row.salary_max != null
      ? `RAL: ${row.salary_min}–${row.salary_max} € (${row.salary_source === "annuncio" ? "da annuncio" : "stima non certa"})`
      : null;
  const offerText = [
    `${row.company_name} — ${row.role_title}`,
    row.location ? `Luogo: ${row.location}` : null,
    `Tipo: ${row.position_type}`,
    salary,
    row.snippet,
    link.kind === "direct"
      ? `Link: ${link.href}`
      : `Cerca online: ${link.href}`,
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

  const { data: history } = await supabase
    .from("discovered_offers")
    .select("company_name, role_title, source_url, status")
    .eq("user_id", userId);

  const historyRows = (history ?? []) as Pick<
    DiscoveredOffer,
    "company_name" | "role_title" | "source_url" | "status"
  >[];
  const { existingRows, seen, watchlist, dismissed } =
    offerHistoryRefs(historyRows);

  let result;
  try {
    result = await discoverOffersForProfile(
      {
        full_name: profile.full_name,
        skills: profile.skills,
        cv_fallback_text: profile.cv_fallback_text,
        job_preference: profile.job_preference,
        companies_of_interest: profile.companies_of_interest,
        preferred_locations: profile.preferred_locations ?? [],
        seen_offers: seen,
        watchlist,
        dismissed,
      },
      { mode: "full", allowRefresh: true },
    );
  } catch (err) {
    return {
      inserted: 0,
      error: toUserFacingError(err, DISCOVERY_ERROR_FALLBACK),
    };
  }

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
        salary_min: offer.salary_min,
        salary_max: offer.salary_max,
        salary_source: offer.salary_source,
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
