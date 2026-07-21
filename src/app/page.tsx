import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/profilo");
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="hero-atmosphere" aria-hidden />
      <header className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5">
        <span className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--ink)]">
          SuMisura
        </span>
        <Link href="/login" className="btn-secondary text-sm">
          Accedi
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 pb-16 pt-8">
        <p className="animate-fade-up text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
          Candidature su misura
        </p>
        <h1 className="animate-fade-up mt-4 max-w-[14ch] font-[family-name:var(--font-display)] text-4xl leading-[1.1] tracking-tight text-[var(--ink)] sm:text-5xl">
          SuMisura
        </h1>
        <p className="animate-fade-up-delay mt-4 max-w-md text-base text-[var(--muted)] sm:text-lg">
          Ottimizza CV e lettera motivazionale sull&apos;offerta, senza inventare
          competenze. I tuoi dati restano solo tuoi.
        </p>
        <div className="animate-fade-up-delay mt-8 flex flex-wrap gap-3">
          <Link href="/register" className="btn-primary">
            Inizia gratis
          </Link>
          <Link href="/login" className="btn-secondary">
            Ho già un account
          </Link>
        </div>
      </section>
    </div>
  );
}
