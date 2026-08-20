import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

import {
  buildFigmaAuthorizeUrl,
  createOAuthState,
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

export async function GET() {
  if (!isFigmaOAuthConfigured()) {
    return NextResponse.redirect(
      new URL(
        "/profilo?figma=missing_oauth_app",
        await siteUrl(),
      ),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/profilo", await siteUrl()),
    );
  }

  const state = createOAuthState();
  const cookieStore = await cookies();
  cookieStore.set("figma_oauth_state", hashState(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  cookieStore.set("figma_oauth_uid", user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  const url = buildFigmaAuthorizeUrl({
    siteUrl: await siteUrl(),
    state,
  });

  return NextResponse.redirect(url);
}
