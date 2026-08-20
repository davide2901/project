import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

import { upsertFigmaConnection } from "@/lib/figma/connection";
import {
  exchangeFigmaCode,
  hashState,
  isFigmaOAuthConfigured,
} from "@/lib/figma/oauth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function siteUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function GET(request: Request) {
  const base = await siteUrl();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const err = searchParams.get("error");

  if (err) {
    return NextResponse.redirect(
      new URL(`/profilo?figma=denied&detail=${encodeURIComponent(err)}`, base),
    );
  }

  if (!isFigmaOAuthConfigured()) {
    return NextResponse.redirect(new URL("/profilo?figma=missing_oauth_app", base));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/profilo?figma=invalid_callback", base));
  }

  const cookieStore = await cookies();
  const expectedHash = cookieStore.get("figma_oauth_state")?.value;
  const oauthUid = cookieStore.get("figma_oauth_uid")?.value;
  cookieStore.delete("figma_oauth_state");
  cookieStore.delete("figma_oauth_uid");

  if (!expectedHash || hashState(state) !== expectedHash) {
    return NextResponse.redirect(new URL("/profilo?figma=state_mismatch", base));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !oauthUid || user.id !== oauthUid) {
    return NextResponse.redirect(new URL("/login?next=/profilo", base));
  }

  try {
    const tokens = await exchangeFigmaCode({ code, siteUrl: base });
    await upsertFigmaConnection({
      userId: user.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresIn: tokens.expires_in,
    });
  } catch (e) {
    const detail =
      e instanceof Error ? e.message : "Errore collegamento Figma";
    return NextResponse.redirect(
      new URL(`/profilo?figma=error&detail=${encodeURIComponent(detail)}`, base),
    );
  }

  return NextResponse.redirect(new URL("/profilo?figma=connected", base));
}
