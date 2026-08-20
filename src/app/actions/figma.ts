"use server";

import { revalidatePath } from "next/cache";

import { extractCvFromText } from "@/lib/ai/extract-cv";
import type { CvExtract } from "@/lib/ai/cv-extract-schema";
import {
  deleteFigmaConnection,
  getFigmaConnectionStatus,
  getValidFigmaAccessToken,
  type FigmaConnectionStatus,
} from "@/lib/figma/connection";
import { createSyncCode, isFigmaOAuthConfigured } from "@/lib/figma/oauth";
import { fetchFigmaFileText } from "@/lib/figma/read-file";
import { parseFigmaUrl } from "@/lib/figma/url";
import { createClient } from "@/lib/supabase/server";

export type ImportFigmaCvResult =
  | { ok: true; extract: CvExtract; fileName: string }
  | { ok: false; error: string };

export type QueueFigmaExportResult =
  | {
      ok: true;
      syncCode: string;
      expiresAt: string;
      figmaUrl: string | null;
    }
  | { ok: false; error: string };

export async function getMyFigmaStatus(): Promise<{
  oauthConfigured: boolean;
  status: FigmaConnectionStatus;
}> {
  const oauthConfigured = isFigmaOAuthConfigured();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      oauthConfigured,
      status: {
        connected: false,
        figma_handle: null,
        figma_email: null,
        connected_at: null,
      },
    };
  }

  const status = await getFigmaConnectionStatus(user.id);
  return { oauthConfigured, status };
}

export async function disconnectFigma(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sessione scaduta." };
  }

  try {
    await deleteFigmaConnection(user.id);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Scollegamento fallito.",
    };
  }

  revalidatePath("/profilo");
  revalidatePath("/home");
  return { ok: true };
}

export async function importCvFromFigma(): Promise<ImportFigmaCvResult> {
  if (!isFigmaOAuthConfigured()) {
    return {
      ok: false,
      error:
        "OAuth Figma non configurato sul server (FIGMA_CLIENT_ID / FIGMA_CLIENT_SECRET).",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sessione scaduta." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("figma_cv_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  const figmaUrl = profile?.figma_cv_url?.trim() ?? "";
  if (!figmaUrl) {
    return {
      ok: false,
      error: "Aggiungi prima il Link Figma CV nel profilo e salva.",
    };
  }

  const parsed = parseFigmaUrl(figmaUrl);
  const fileKey = parsed?.fileKey ?? figmaUrl;
  if (!fileKey) {
    return { ok: false, error: "URL Figma CV non valido." };
  }

  try {
    const accessToken = await getValidFigmaAccessToken(user.id);
    const { name, text } = await fetchFigmaFileText({
      accessToken,
      fileKey,
      nodeId: parsed?.nodeId,
    });
    const extract = await extractCvFromText(text);
    return { ok: true, extract, fileName: name };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Import da Figma fallito.",
    };
  }
}

export async function queueFigmaExport(opts: {
  applicationId?: string | null;
  companyName: string;
  roleTitle: string;
  optimizedCvText: string;
  coverLetter: string;
}): Promise<QueueFigmaExportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sessione scaduta." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("figma_cv_url")
    .eq("user_id", user.id)
    .maybeSingle();

  const figmaUrl = profile?.figma_cv_url?.trim() || null;
  const parsed = figmaUrl ? parseFigmaUrl(figmaUrl) : null;
  const fileKey = parsed?.fileKey ?? null;

  const syncCode = createSyncCode();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const { error } = await supabase.from("figma_export_jobs").insert({
    user_id: user.id,
    application_id: opts.applicationId ?? null,
    file_key: fileKey,
    node_name: process.env.FIGMA_CV_TEXT_NODE_NAME?.trim() || "__cv_body__",
    sync_code: syncCode,
    expires_at: expiresAt.toISOString(),
    status: "pending",
    payload: {
      company_name: opts.companyName,
      role_title: opts.roleTitle,
      cv_text: opts.optimizedCvText,
      cover_letter: opts.coverLetter,
    },
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("figma_export_jobs") ||
        error.code === "42P01"
          ? "Tabella figma_export_jobs assente. Esegui la migration 006_figma_oauth.sql."
          : error.message,
    };
  }

  return {
    ok: true,
    syncCode,
    expiresAt: expiresAt.toISOString(),
    figmaUrl,
  };
}
