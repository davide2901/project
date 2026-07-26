import type { Metadata } from "next";

import { NewApplicationForm } from "@/components/application/new-application-form";

export const metadata: Metadata = {
  title: "Nuova candidatura · SuMisura",
};

export default function NewApplicationPage() {
  const mock =
    process.env.USE_AI_MOCK === "true" ||
    process.env.USE_AI_MOCK === "1" ||
    process.env.NEXT_PUBLIC_USE_AI_MOCK === "true";

  return (
    <div className="space-y-8 animate-fade-up">
      <header className="space-y-2">
        <p className="text-sm text-[var(--muted)]">
          {mock ? "Modalità mock · fixtures" : "Generazione con Gemini"}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
          Nuova candidatura
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-[var(--muted)]">
          {mock
            ? "Incolla un’offerta o scegli un esempio: la risposta arriva dai facsimile, senza chiamata AI."
            : "Incolla offerta o link. Generiamo CV, lettera ed email usando solo le competenze già nel tuo profilo."}
        </p>
      </header>
      <NewApplicationForm mockMode={mock} />
    </div>
  );
}
