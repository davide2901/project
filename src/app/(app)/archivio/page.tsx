import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Archivio · SuMisura",
};

export default function ArchivePage() {
  return (
    <div className="space-y-6 animate-fade-up">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
          Fase 3
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
          Archivio
        </h1>
        <p className="max-w-prose text-sm text-[var(--muted)]">
          Storico candidature (azienda, ruolo, data) e materiali scaricabili.
          Schema e UI arriveranno in Fase 3.
        </p>
      </header>
      <div className="rounded-lg border border-dashed border-[var(--line)] px-4 py-10 text-center">
        <p className="text-sm text-[var(--muted)]">Nessuna candidatura ancora.</p>
        <Link
          href="/candidatura/nuova"
          className="mt-4 inline-flex btn-primary"
        >
          Nuova candidatura
        </Link>
      </div>
    </div>
  );
}
