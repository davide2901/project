import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Application } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Archivio · SuMisura",
};

export default async function ArchivePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: rows, error } = await supabase
    .from("applications")
    .select(
      "id, company_name, role_title, position_type, created_at, status, optimized_cv_text, cover_letter",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const applications = (rows ?? []) as Pick<
    Application,
    | "id"
    | "company_name"
    | "role_title"
    | "position_type"
    | "created_at"
    | "status"
    | "optimized_cv_text"
    | "cover_letter"
  >[];

  const tableMissing =
    error?.message?.toLowerCase().includes("does not exist") ||
    error?.code === "42P01" ||
    error?.code === "PGRST205";

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
          Storico
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
          Archivio
        </h1>
        <p className="max-w-prose text-sm text-[var(--muted)]">
          Candidature salvate (senza duplicati sulla stessa offerta). Per
          generarne una nuova vai in Home.
        </p>
      </header>

      {tableMissing ? (
        <p className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--muted)]">
          Esegui su Supabase{" "}
          <code className="text-[var(--ink)]">002_applications.sql</code> per
          attivare l&apos;archivio.
        </p>
      ) : error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </p>
      ) : applications.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          Nessuna candidatura in archivio.{" "}
          <Link
            href="/home"
            className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Torna alla Home
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {applications.map((app) => (
            <li key={app.id} className="space-y-1 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--ink)]">
                    {app.company_name}
                  </p>
                  <p className="truncate text-sm text-[var(--muted)]">
                    {app.role_title}
                  </p>
                </div>
                <time
                  className="shrink-0 text-xs text-[var(--muted)]"
                  dateTime={app.created_at}
                >
                  {new Date(app.created_at).toLocaleDateString("it-IT")}
                </time>
              </div>
              <p className="text-xs text-[var(--muted)]">
                {labelPosition(app.position_type)}
                {app.optimized_cv_text || app.cover_letter
                  ? " · materiali pronti"
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function labelPosition(type: Application["position_type"]) {
  switch (type) {
    case "lavoro":
      return "Lavoro";
    case "stage":
      return "Stage / tirocinio";
    default:
      return "Tipo non chiaro";
  }
}
