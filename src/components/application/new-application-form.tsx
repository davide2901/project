"use client";

import { useState, useTransition } from "react";

/**
 * Stub UI della Nuova Candidatura (Fase 1).
 * La chiamata a Claude NON è implementata: attendiamo il prototipo HTML
 * con prompt e JSON schema prima di scrivere le logiche LLM.
 */
export function NewApplicationForm() {
  const [offer, setOffer] = useState("");
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => {
      setNotice(
        "Generazione AI in pausa: invia il prototipo HTML con i prompt e lo schema JSON prima di collegare Claude.",
      );
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="offer" className="text-sm font-medium">
          Testo o link dell&apos;offerta
        </label>
        <textarea
          id="offer"
          name="offer"
          rows={12}
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          required
          className="field resize-y"
          placeholder={
            "Incolla qui l'annuncio (testo completo) oppure un URL...\n\nVerranno estratti: azienda, ruolo, keyword ATS.\nPoi ricerca web sull'azienda e generazione CV / lettera / email."
          }
        />
      </div>

      <div className="rounded-lg border border-dashed border-[var(--accent)]/40 bg-[var(--tint)] px-4 py-3 text-sm text-[var(--ink)]">
        <p className="font-medium">Output previsto (dopo integrazione Claude)</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-[var(--muted)]">
          <li>CV testuale ottimizzato (solo competenze già presenti)</li>
          <li>Lettera motivazionale</li>
          <li>Bozza email</li>
          <li>Sintesi ricerca azienda (fatti reali o &quot;non reperibile&quot;)</li>
        </ul>
      </div>

      {notice ? (
        <p
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          {notice}
        </p>
      ) : null}

      <button
        type="submit"
        className="btn-primary"
        disabled={pending || !offer.trim()}
      >
        {pending ? "Preparazione..." : "Genera candidatura"}
      </button>
    </form>
  );
}
