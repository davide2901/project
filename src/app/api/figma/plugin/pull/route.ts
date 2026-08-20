import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Endpoint per il plugin Figma: scambia sync_code → payload CV/lettera.
 * Auth = conoscenza del codice monouso (scade in 1h).
 */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ error: "Parametro code mancante." }, { status: 400 });
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Service client non configurato",
      },
      { status: 500 },
    );
  }

  const { data, error } = await admin
    .from("figma_export_jobs")
    .select("*")
    .eq("sync_code", code)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Codice non valido." }, { status: 404 });
  }

  if (data.status !== "pending") {
    return NextResponse.json(
      { error: `Job già ${data.status}.` },
      { status: 410 },
    );
  }

  if (new Date(data.expires_at as string).getTime() < Date.now()) {
    await admin
      .from("figma_export_jobs")
      .update({ status: "expired" })
      .eq("id", data.id);
    return NextResponse.json({ error: "Codice scaduto." }, { status: 410 });
  }

  await admin
    .from("figma_export_jobs")
    .update({
      status: "consumed",
      consumed_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  const payload = data.payload as {
    cv_text?: string;
    cover_letter?: string;
    company_name?: string;
    role_title?: string;
  };

  return NextResponse.json({
    ok: true,
    node_name: data.node_name ?? "__cv_body__",
    file_key: data.file_key,
    company_name: payload.company_name ?? "",
    role_title: payload.role_title ?? "",
    cv_text: payload.cv_text ?? "",
    cover_letter: payload.cover_letter ?? "",
  });
}
