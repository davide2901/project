import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Account · SuMisura",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const created = user.created_at
    ? new Date(user.created_at).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-8 animate-fade-up">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
          Impostazioni
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
          Account
        </h1>
        <p className="max-w-prose text-sm text-[var(--muted)]">
          Dettagli di accesso e sessione. Per CV e competenze usa il Profilo.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Dettagli
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex flex-col gap-0.5 border-b border-[var(--line)] pb-3">
            <dt className="text-[var(--muted)]">Nome</dt>
            <dd className="font-medium text-[var(--ink)]">
              {profile?.full_name?.trim() || "Non impostato"}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 border-b border-[var(--line)] pb-3">
            <dt className="text-[var(--muted)]">Email</dt>
            <dd className="font-medium text-[var(--ink)] break-all">
              {user.email ?? "—"}
            </dd>
          </div>
          {created ? (
            <div className="flex flex-col gap-0.5 border-b border-[var(--line)] pb-3">
              <dt className="text-[var(--muted)]">Account creato</dt>
              <dd className="font-medium text-[var(--ink)]">{created}</dd>
            </div>
          ) : null}
          <div className="flex flex-col gap-0.5">
            <dt className="text-[var(--muted)]">Provider</dt>
            <dd className="font-medium text-[var(--ink)]">
              {user.app_metadata?.provider === "google"
                ? "Google"
                : "Email e password"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Scorciatoie
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link
              href="/profilo"
              className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
            >
              Modifica profilo CV
            </Link>
          </li>
          <li>
            <Link
              href="/archivio"
              className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
            >
              Vedi archivio candidature
            </Link>
          </li>
        </ul>
      </section>

      <form action={signOut}>
        <button type="submit" className="btn-secondary">
          Esci
        </button>
      </form>
    </div>
  );
}
