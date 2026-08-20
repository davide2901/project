import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Sessione da cookie (locale): abbastanza per gate di navigazione.
  // La validazione forte resta su RLS + getUser dove serve (login/mutazioni).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isPublicApi =
    pathname.startsWith("/api/figma/plugin/") ||
    pathname.startsWith("/api/figma/callback") ||
    pathname.startsWith("/api/cron/");
  const isPublicRoute =
    pathname === "/" ||
    isAuthRoute ||
    pathname.startsWith("/auth/callback") ||
    isPublicApi;

  if (!userId && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Conserva query (es. code OAuth) oltre al path
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (userId && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
