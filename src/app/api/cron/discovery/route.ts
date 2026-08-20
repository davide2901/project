import { NextResponse } from "next/server";

import { runDiscoveryForUserId } from "@/app/actions/discovery";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types/database";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_USERS = 20;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Service client non configurato",
      },
      { status: 500 },
    );
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .limit(MAX_USERS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (profiles ?? []) as Profile[];
  const eligible = rows.filter(
    (p) =>
      p.skills.length > 0 || Boolean(p.cv_fallback_text?.trim()),
  );

  const summary: {
    userId: string;
    inserted: number;
    error?: string;
  }[] = [];

  for (const profile of eligible) {
    const result = await runDiscoveryForUserId(profile.user_id, profile);
    summary.push({
      userId: profile.user_id,
      inserted: result.inserted,
      error: result.error,
    });
  }

  return NextResponse.json({
    ok: true,
    scanned: eligible.length,
    results: summary,
  });
}
