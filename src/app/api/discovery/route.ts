import { NextResponse } from "next/server";

import { runDiscovery } from "@/app/actions/discovery";

export const runtime = "nodejs";
/** Due chiamate Gemini + grounding possono superare i 10s di default Hobby. */
export const maxDuration = 60;

export async function POST() {
  const t0 = Date.now();
  try {
    const result = await runDiscovery();
    console.info(
      JSON.stringify({
        scope: "discovery",
        stage: "api_post_done",
        ms: Date.now() - t0,
        ok: result.ok,
        inserted: result.ok ? result.inserted : undefined,
        error: result.ok ? undefined : result.error,
        t: Date.now(),
      }),
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    console.error(
      JSON.stringify({
        scope: "discovery",
        stage: "api_post_fatal",
        ms: Date.now() - t0,
        error: err instanceof Error ? err.message.slice(0, 300) : "unknown",
        t: Date.now(),
      }),
    );
    return NextResponse.json(
      {
        ok: false,
        error: "Ricerca offerte non disponibile al momento. Riprova tra poco.",
      },
      { status: 500 },
    );
  }
}
