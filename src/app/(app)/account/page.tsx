import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/layout/header-menu";
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

  const provider =
    user.app_metadata?.provider === "google" ? "Google" : "Email e password";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="label-caps">Impostazioni</p>
        <h1 className="font-[family-name:var(--font-display)] text-[1.85rem] tracking-tight text-[var(--ink)] sm:text-3xl">
          Account
        </h1>
        <p className="max-w-prose text-sm text-[var(--muted)]">
          Dettagli di accesso. Per CV e competenze usa il Profilo.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow)]">
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
            <dd className="break-all font-medium text-[var(--ink)]">
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
            <dt className="text-[var(--muted)]">Accesso con</dt>
            <dd className="font-medium text-[var(--ink)]">{provider}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Vai a
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/profilo" className="text-link">
              Modifica profilo
            </Link>
          </li>
          <li>
            <Link href="/archivio" className="text-link">
              Archivio candidature
            </Link>
          </li>
          <li>
            <Link href="/statistiche" className="text-link">
              Statistiche
            </Link>
          </li>
        </ul>
      </section>

      <SignOutButton />
    </div>
  );
}
