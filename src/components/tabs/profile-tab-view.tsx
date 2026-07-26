"use client";

import Link from "next/link";

import { ProfileForm } from "@/components/profile/profile-form";
import type { TabsBootstrap } from "@/lib/tabs/bootstrap";

export function ProfileTabView({ data }: { data: TabsBootstrap["profilo"] }) {
  if (data.error) {
    return (
      <div className="space-y-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">Profilo</h1>
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Impossibile caricare il profilo: {data.error}
        </p>
      </div>
    );
  }

  if (!data.profile) {
    return (
      <div className="space-y-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">Profilo</h1>
        <p className="text-sm text-[var(--muted)]">
          Nessun profilo trovato. Verifica la migration SQL su Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-[1.85rem] tracking-tight text-[var(--ink)] sm:text-3xl">
          Il tuo profilo
        </h1>
        <p className="max-w-prose text-sm text-[var(--muted)]">
          Raccontaci chi sei e cosa stai cercando. Poi{" "}
          <Link
            href="/candidatura/nuova"
            className="text-link"
          >
            nuova candidatura
          </Link>
          .
        </p>
      </header>
      <ProfileForm profile={data.profile} />
    </div>
  );
}
