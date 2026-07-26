import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/types/database";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/home";
  const next = nextRaw.startsWith("/") ? nextRaw : "/home";

  if (code) {
    // I cookie di sessione devono essere attaccati alla Response di redirect
    // (cookieStore di next/headers da solo non basta sul Route Handler).
    const redirectUrl = NextResponse.redirect(new URL(next, origin));

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              redirectUrl.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectUrl;
    }

    const fail = NextResponse.redirect(
      new URL(
        `/login?error=auth_callback&detail=${encodeURIComponent(error.message)}`,
        origin,
      ),
    );
    return fail;
  }

  return NextResponse.redirect(new URL("/login?error=auth_callback", origin));
}
