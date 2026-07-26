import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ApplicationListItem,
  DiscoveredOffer,
  Profile,
} from "@/lib/types/database";

export type TabId = "home" | "archivio" | "statistiche" | "profilo";

export type TabsBootstrap = {
  home: {
    count: number | null;
    firstName: string | null;
    profileReady: boolean;
    offers: DiscoveredOffer[];
  };
  archivio: {
    items: ApplicationListItem[];
    error: string | null;
  };
  statistiche: {
    total: number;
    lavoro: number;
    stage: number;
  };
  profilo: {
    profile: Profile | null;
    error: string | null;
  };
};

export const TAB_PATHS: Record<TabId, string> = {
  home: "/home",
  archivio: "/archivio",
  statistiche: "/statistiche",
  profilo: "/profilo",
};

export function pathToTab(pathname: string): TabId | null {
  if (pathname === "/home") return "home";
  if (pathname === "/archivio") return "archivio";
  if (pathname === "/statistiche") return "statistiche";
  if (pathname === "/profilo") return "profilo";
  return null;
}

export function isMainTabPath(pathname: string): boolean {
  return pathToTab(pathname) !== null;
}

export async function loadTabsBootstrap(
  supabase: SupabaseClient,
  userId: string,
): Promise<TabsBootstrap> {
  const [countRes, profileRes, offersRes, appsRes] = await Promise.all([
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null),
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("discovered_offers")
      .select(
        "id, user_id, company_name, role_title, position_type, location, source_url, snippet, match_reason, status, created_at, updated_at",
      )
      .eq("user_id", userId)
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("applications")
      .select("id, company_name, role_title, position_type, status, created_at")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const profile = (profileRes.data as Profile | null) ?? null;
  const apps = (appsRes.data ?? []) as ApplicationListItem[];
  const offers = (offersRes.data ?? []) as DiscoveredOffer[];

  const profileReady = Boolean(
    profile &&
      (profile.skills.length > 0 ||
        profile.cv_fallback_text?.trim() ||
        profile.figma_cv_url?.trim()),
  );

  return {
    home: {
      count: countRes.count,
      firstName: profile?.full_name?.trim().split(/\s+/)[0] ?? null,
      profileReady,
      offers,
    },
    archivio: {
      items: apps,
      error: appsRes.error?.message ?? null,
    },
    statistiche: {
      total: apps.length,
      lavoro: apps.filter((a) => a.position_type === "lavoro").length,
      stage: apps.filter((a) => a.position_type === "stage").length,
    },
    profilo: {
      profile,
      error: profileRes.error?.message ?? null,
    },
  };
}
