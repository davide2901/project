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
    .select("full_name, skills, cv_fallback_text")
    .eq("user_id", user.id)
    .maybeSingle();

  const created = user.created_at
    ? new Date(user.created_at).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const providerLabel =
    user.app_metadata?.provider === "google"
      ? "Google"
      : "Email e password";

  const profileReady = Boolean(
    profile &&
      ((profile.skills?.length ?? 0) > 0 || profile.cv_fallback_text?.trim()),
  );

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <Link
          href="/home"
          className="inline-flex min-h-10 items-center text-sm text-[var(--muted)] transition active:text-[var(--ink)]"
        >
          ← Home
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-[1.85rem] tracking-tight text-[var(--ink)] sm:text-3xl">
          Account
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-[var(--muted)]">
          Qui gestisci l&apos;accesso. CV, competenze e preferenze stanno nel{" "}
          <Link href="/profilo" className="text-link">
            Profilo
          </Link>
          .
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            Dati di accesso
          </h2>
        </div>
        <dl className="divide-y divide-[var(--line)] text-sm">
          <DetailRow
            label="Nome"
            value={profile?.full_name?.trim() || "Non impostato nel Profilo"}
          />
          <DetailRow label="Email" value={user.email ?? "—"} breakAll />
          <DetailRow label="Metodo di accesso" value={providerLabel} />
          {created ? (
            <DetailRow label="Iscritto dal" value={created} />
          ) : null}
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
          Profilo professionale
        </h2>
        <Link
          href="/profilo"
          className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 text-left shadow-[var(--shadow)] transition active:bg-[var(--tint)]"
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[var(--ink)]">
              {profileReady ? "Apri o modifica il Profilo" : "Completa il Profilo"}
            </p>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              {profileReady
                ? "CV, competenze, preferenze lavoro/stage"
                : "Aggiungi CV o competenze per ricevere offerte"}
            </p>
          </div>
          <span aria-hidden className="text-[var(--muted)]">
            ›
          </span>
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
          Scorciatoie
        </h2>
        <ul className="space-y-2">
          <li>
            <ShortcutRow href="/archivio" title="Archivio" subtitle="Candidature e documenti" />
          </li>
          <li>
            <ShortcutRow
              href="/statistiche"
              title="Statistiche"
              subtitle="Quante candidature e a che punto sono"
            />
          </li>
        </ul>
      </section>

      <section className="space-y-3 border-t border-[var(--line)] pt-6">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Sessione</h2>
        <p className="text-sm text-[var(--muted)]">
          Esci da questo dispositivo. Potrai accedere di nuovo con la stessa
          email.
        </p>
        <SignOutButton />
      </section>
    </div>
  );
}

function DetailRow({
  label,
  value,
  breakAll,
}: {
  label: string;
  value: string;
  breakAll?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
        {label}
      </dt>
      <dd
        className={`font-medium text-[var(--ink)] ${
          breakAll ? "break-all" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function ShortcutRow({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 text-left transition active:bg-[var(--tint)]"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[var(--ink)]">{title}</p>
        <p className="mt-0.5 text-sm text-[var(--muted)]">{subtitle}</p>
      </div>
      <span aria-hidden className="text-[var(--muted)]">
        ›
      </span>
    </Link>
  );
}
