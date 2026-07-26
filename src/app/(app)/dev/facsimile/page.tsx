import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LoadFacsimilesButton } from "@/components/dev/load-facsimiles-button";

export const metadata: Metadata = {
  title: "Facsimile · Dev",
};

export default function FacsimilesDevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
          Development
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
          Facsimile di test
        </h1>
        <p className="max-w-prose text-sm text-[var(--muted)]">
          Inserisce nel tuo account un profilo campione e tre candidature
          (Bending Spoons, Satispay stage, N26) senza chiamare Gemini. Utile per
          verificare UI Archivio, dettaglio e layout risultati.
        </p>
      </header>

      <LoadFacsimilesButton />

      <ul className="space-y-2 text-sm text-[var(--muted)]">
        <li>
          File: <code className="text-xs">fixtures/profile.json</code>
        </li>
        <li>
          Offerte: <code className="text-xs">fixtures/offers/*.txt</code>
        </li>
        <li>
          Pacchetti:{" "}
          <code className="text-xs">fixtures/applications/*.json</code>
        </li>
        <li>
          Mockup UI: <code className="text-xs">docs/mockups/</code>
        </li>
      </ul>

      <p className="text-sm">
        Dopo il carico:{" "}
        <Link href="/archivio" className="text-[var(--accent)] underline-offset-2 hover:underline">
          apri Archivio
        </Link>
        {" · "}
        <Link href="/profilo" className="text-[var(--accent)] underline-offset-2 hover:underline">
          Profilo
        </Link>
      </p>
    </div>
  );
}
