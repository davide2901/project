import type { Metadata } from "next";

import { NewApplicationForm } from "@/components/application/new-application-form";

export const metadata: Metadata = {
  title: "Nuova candidatura · SuMisura",
};

export default function NewApplicationPage() {
  return (
    <div className="space-y-8 animate-fade-up">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
          Flusso testuale · Fase 1
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
          Nuova candidatura
        </h1>
        <p className="max-w-prose text-sm text-[var(--muted)]">
          Incolla offerta o link. L&apos;AI riformulerà solo competenze già nel
          tuo CV di fallback — niente invenzioni. La chiamata a Claude resta in
          attesa del prototipo HTML (prompt + JSON schema).
        </p>
      </header>
      <NewApplicationForm />
    </div>
  );
}
