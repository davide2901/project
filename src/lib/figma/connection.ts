import { createServiceClient } from "@/lib/supabase/admin";
import {
  expiresAtFromSeconds,
  fetchFigmaMe,
  refreshFigmaToken,
} from "@/lib/figma/oauth";
import type { FigmaConnectionStatus } from "@/lib/types/database";

export type { FigmaConnectionStatus };

export type FigmaConnectionRow = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  figma_user_id: string | null;
  figma_email: string | null;
  figma_handle: string | null;
  connected_at: string;
};

export async function upsertFigmaConnection(opts: {
  userId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number;
}): Promise<FigmaConnectionStatus> {
  const admin = createServiceClient();
  const me = await fetchFigmaMe(opts.accessToken);
  const expiresAt = expiresAtFromSeconds(opts.expiresIn);

  const { error } = await admin.from("figma_connections").upsert(
    {
      user_id: opts.userId,
      access_token: opts.accessToken,
      refresh_token: opts.refreshToken ?? null,
      expires_at: expiresAt.toISOString(),
      figma_user_id: String(me.id),
      figma_email: me.email ?? null,
      figma_handle: me.handle ?? null,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  return {
    connected: true,
    figma_handle: me.handle ?? null,
    figma_email: me.email ?? null,
    connected_at: new Date().toISOString(),
  };
}

export async function deleteFigmaConnection(userId: string): Promise<void> {
  const admin = createServiceClient();
  const { error } = await admin
    .from("figma_connections")
    .delete()
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getFigmaConnectionStatus(
  userId: string,
): Promise<FigmaConnectionStatus> {
  try {
    const admin = createServiceClient();
    const { data, error } = await admin
      .from("figma_connections")
      .select("figma_handle, figma_email, connected_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return {
        connected: false,
        figma_handle: null,
        figma_email: null,
        connected_at: null,
      };
    }

    return {
      connected: true,
      figma_handle: data.figma_handle ?? null,
      figma_email: data.figma_email ?? null,
      connected_at: data.connected_at ?? null,
    };
  } catch {
    return {
      connected: false,
      figma_handle: null,
      figma_email: null,
      connected_at: null,
    };
  }
}

/** Restituisce un access token valido (refresh se necessario). */
export async function getValidFigmaAccessToken(
  userId: string,
): Promise<string> {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("figma_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Figma non collegato. Collega il tuo account nel Profilo.");
  }

  const row = data as FigmaConnectionRow;
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const stillValid = expiresAt > Date.now() + 60_000;

  if (stillValid) {
    return row.access_token;
  }

  if (!row.refresh_token) {
    throw new Error(
      "Sessione Figma scaduta. Scollega e ricollega l'account nel Profilo.",
    );
  }

  const refreshed = await refreshFigmaToken(row.refresh_token);
  await upsertFigmaConnection({
    userId,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? row.refresh_token,
    expiresIn: refreshed.expires_in,
  });

  return refreshed.access_token;
}
