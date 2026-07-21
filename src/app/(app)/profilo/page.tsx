import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Profilo · SuMisura",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">Profilo</h1>
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Impossibile caricare il profilo: {error.message}
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">Profilo</h1>
        <p className="text-sm text-[var(--muted)]">
          Nessun profilo trovato. Verifica che la migration SQL sia stata
          eseguita su Supabase (trigger su auth.users).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
          Il tuo spazio
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
          Profilo
        </h1>
        <p className="max-w-prose text-sm text-[var(--muted)]">
          Configura CV, competenze e preferenza lavoro/stage. Poi avvia una{" "}
          <Link
            href="/candidatura/nuova"
            className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
          >
            nuova candidatura
          </Link>
          .
        </p>
      </header>
      <ProfileForm profile={profile as Profile} />
    </div>
  );
}
