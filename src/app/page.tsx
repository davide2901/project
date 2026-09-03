import Link from "next/link";
import { redirect } from "next/navigation";
import type { Viewport } from "next";

import { createClient } from "@/lib/supabase/server";

export const viewport: Viewport = {
  themeColor: "#070f1a",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }

  return (
    <div className="landing-night relative flex min-h-dvh flex-1 flex-col overflow-hidden">
      <div className="landing-light" aria-hidden />

      <header
        className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5"
        style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
      >
        <span className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--sand)]">
          SuMisura
        </span>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center px-2 text-sm text-[var(--sand-muted)] transition active:text-[var(--sand)]"
        >
          Accedi
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 pb-16 pt-4">
        <h1 className="animate-fade-up max-w-[10ch] font-[family-name:var(--font-display)] text-[2.75rem] leading-[1.05] tracking-tight text-[var(--sand)] sm:text-6xl">
          SuMisura
        </h1>
        <div
          className="animate-fade-up mt-5 h-px w-16 bg-[color-mix(in_oklab,var(--sand)_45%,transparent)]"
          aria-hidden
        />
        <p className="animate-fade-up-delay mt-5 max-w-sm text-base leading-relaxed text-[var(--sand-muted)] sm:text-lg">
          Candidature allineate all&apos;offerta, senza inventare competenze.
        </p>

        <ol className="animate-fade-up-delay mt-8 max-w-sm space-y-3 text-sm leading-relaxed text-[var(--sand-muted)]">
          <li className="flex gap-3">
            <span className="font-[family-name:var(--font-display)] text-[var(--sand)]">
              1
            </span>
            <span>Completa il profilo con CV e competenze reali</span>
          </li>
          <li className="flex gap-3">
            <span className="font-[family-name:var(--font-display)] text-[var(--sand)]">
              2
            </span>
            <span>Trova offerte adatte a te</span>
          </li>
          <li className="flex gap-3">
            <span className="font-[family-name:var(--font-display)] text-[var(--sand)]">
              3
            </span>
            <span>Genera CV, lettera e PDF pronti da inviare</span>
          </li>
        </ol>

        <div className="animate-fade-up-delay mt-10 flex w-full flex-col gap-3">
          <Link href="/register" className="btn-landing-primary w-full sm:w-auto">
            Inizia gratis
            <span aria-hidden>→</span>
          </Link>
          <Link href="/login" className="btn-ghost-sand w-full sm:w-auto">
            Ho già un account
          </Link>
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex w-full max-w-3xl gap-4 px-5 pb-8 text-xs text-[var(--sand-muted)]">
        <Link href="/privacy" className="hover:text-[var(--sand)] hover:underline">
          Privacy
        </Link>
        <Link href="/termini" className="hover:text-[var(--sand)] hover:underline">
          Termini
        </Link>
      </footer>
    </div>
  );
}
