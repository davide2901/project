"use client";

import { useState, useTransition } from "react";

import { generateApplicationFromOffer } from "@/app/actions/application";
import type { ApplicationPackage } from "@/lib/ai/schema";

export function NewApplicationForm() {
  const [offer, setOffer] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApplicationPackage | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await generateApplicationFromOffer(offer);
      if (!res.ok) {
        setResult(null);
        setError(res.error);
        return;
      }
      setResult(res.data);
    });
  }

  return (
    <div className="space-y-8">
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

        {error ? (
          <p
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="btn-primary"
          disabled={pending || !offer.trim()}
        >
          {pending ? "Generazione in corso..." : "Genera candidatura"}
        </button>
      </form>

      {result ? <ApplicationResult data={result} /> : null}
    </div>
  );
}

function ApplicationResult({ data }: { data: ApplicationPackage }) {
  return (
    <div className="space-y-6 animate-fade-up">
      <header className="space-y-1 border-t border-[var(--line)] pt-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
          Risultato
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          {data.company_name} · {data.role_title}
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Tipo posizione: {labelPosition(data.position_type)}
        </p>
      </header>

      <ResultBlock title="Keyword ATS" body={data.ats_keywords.join(" · ") || "—"} />
      <ResultBlock
        title="Competenze allineate (dal tuo CV)"
        body={data.matched_skills.join(" · ") || "—"}
      />
      <ResultBlock
        title="Requisiti offerta non coperti"
        body={
          data.omitted_offer_requirements.length
            ? data.omitted_offer_requirements.map((r) => `• ${r}`).join("\n")
            : "Nessuno evidenziato"
        }
      />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--ink)]">Ricerca azienda</h3>
        <p className="text-sm text-[var(--muted)]">{data.company_research.summary}</p>
        <ul className="space-y-2 text-sm">
          {data.company_research.facts.map((fact) => (
            <li
              key={`${fact.label}-${fact.value}`}
              className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
            >
              <span className="font-medium">{fact.label}:</span> {fact.value}
              {fact.source ? (
                <span className="mt-1 block truncate text-xs text-[var(--muted)]">
                  Fonte: {fact.source}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        {data.company_research.unavailable_notes.length ? (
          <p className="text-xs text-[var(--muted)]">
            Non reperibile: {data.company_research.unavailable_notes.join(" · ")}
          </p>
        ) : null}
      </section>

      <ResultBlock title="CV ottimizzato" body={data.optimized_cv_text} mono />
      <ResultBlock title="Lettera motivazionale" body={data.cover_letter} />
      <ResultBlock
        title="Bozza email"
        body={`Oggetto: ${data.email_draft.subject}\n\n${data.email_draft.body}`}
      />

      {data.honesty_notes.length ? (
        <ResultBlock
          title="Note di trasparenza"
          body={data.honesty_notes.map((n) => `• ${n}`).join("\n")}
        />
      ) : null}
    </div>
  );
}

function ResultBlock({
  title,
  body,
  mono,
}: {
  title: string;
  body: string;
  mono?: boolean;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
        <CopyButton text={body} />
      </div>
      <pre
        className={`whitespace-pre-wrap rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--ink)] ${
          mono ? "font-[family-name:var(--font-mono)]" : ""
        }`}
      >
        {body}
      </pre>
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="text-xs font-medium text-[var(--accent)] underline-offset-2 hover:underline"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copiato" : "Copia"}
    </button>
  );
}

function labelPosition(type: ApplicationPackage["position_type"]) {
  switch (type) {
    case "lavoro":
      return "Lavoro";
    case "stage":
      return "Stage / tirocinio / internship";
    default:
      return "Non chiaro dall'offerta";
  }
}
