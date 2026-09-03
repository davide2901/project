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
    <div className="space-y-4 animate-fade-up">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)]">
          Nuova candidatura
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {mock
            ? "Incolla l’offerta o un esempio mock."
            : "Incolla testo o link dell’annuncio."}
        </p>
      </header>
      <NewApplicationForm mockMode={mock} />
    </div>
  );
}
