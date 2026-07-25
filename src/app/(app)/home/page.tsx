import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Application } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Home · SuMisura",
};

function startOfMonthIso() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function HomeDashboardPage() {
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
      "id, company_name, role_title, position_type, created_at, status",
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
  >[];

  const tableMissing =
    error?.message?.toLowerCase().includes("does not exist") ||
    error?.code === "42P01" ||
    error?.code === "PGRST205";

  const monthStart = startOfMonthIso();
  const thisMonth = applications.filter((a) => a.created_at >= monthStart);
  const stageCount = applications.filter((a) => a.position_type === "stage").length;
  const lavoroCount = applications.filter(
    (a) => a.position_type === "lavoro",
  ).length;
  const recent = applications.slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-up">
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
          Panoramica
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
          Home
        </h1>
        <p className="max-w-prose text-sm text-[var(--muted)]">
          Genera una candidatura dall&apos;offerta, poi scarica PDF o apri Figma.
        </p>
        <Link href="/candidatura/nuova" className="btn-primary inline-flex">
          Nuova candidatura
        </Link>
      </header>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Stats
        </h2>
        {tableMissing ? (
          <p className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--muted)]">
            Per attivare le stats esegui su Supabase la migration{" "}
            <code className="text-[var(--ink)]">002_applications.sql</code>.
          </p>
        ) : error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Impossibile caricare le stats: {error.message}
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Totale" value={applications.length} />
            <Stat label="Questo mese" value={thisMonth.length} />
            <Stat label="Lavoro" value={lavoroCount} />
            <Stat label="Stage" value={stageCount} />
          </dl>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Ultime candidature
          </h2>
          <Link
            href="/archivio"
            className="text-xs font-medium text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Archivio
          </Link>
        </div>
        {!tableMissing && !error && recent.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Nessuna candidatura ancora. Parti da &quot;Nuova candidatura&quot;.
          </p>
        ) : null}
        {recent.length > 0 ? (
          <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {recent.map((app) => (
              <li key={app.id} className="flex items-start justify-between gap-3 py-3">
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
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-b border-[var(--line)] pb-2">
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
        {value}
      </dd>
    </div>
  );
}
