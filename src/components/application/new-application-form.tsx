"use client";

import { useState, useTransition } from "react";

import { generateApplicationFromOffer } from "@/app/actions/application";
import type { ApplicationPackage } from "@/lib/ai/schema";

type ResultState = {
  data: ApplicationPackage;
  reused: boolean;
  figmaCvUrl: string | null;
  figmaPortfolioUrl: string | null;
};

export function NewApplicationForm() {
  const [offer, setOffer] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);

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
      setResult({
        data: res.data,
        reused: res.reused,
        figmaCvUrl: res.figmaCvUrl,
        figmaPortfolioUrl: res.figmaPortfolioUrl,
      });
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

      {result ? (
        <ApplicationResult
          data={result.data}
          reused={result.reused}
          figmaCvUrl={result.figmaCvUrl}
          figmaPortfolioUrl={result.figmaPortfolioUrl}
        />
      ) : null}
    </div>
  );
}

function ApplicationResult({
  data,
  reused,
  figmaCvUrl,
  figmaPortfolioUrl,
}: {
  data: ApplicationPackage;
  reused: boolean;
  figmaCvUrl: string | null;
  figmaPortfolioUrl: string | null;
}) {
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
        {reused ? (
          <p className="text-xs text-[var(--muted)]">
            Stessa offerta già cercata: aggiornata in archivio senza creare un
            duplicato.
          </p>
        ) : null}
      </header>

      <ExportActions
        data={data}
        figmaCvUrl={figmaCvUrl}
        figmaPortfolioUrl={figmaPortfolioUrl}
      />

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
          {data.company_research.facts.map((fact, index) => (
            <li
              key={`${fact.label}-${fact.value}-${index}`}
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

function ExportActions({
  data,
  figmaCvUrl,
  figmaPortfolioUrl,
}: {
  data: ApplicationPackage;
  figmaCvUrl: string | null;
  figmaPortfolioUrl: string | null;
}) {
  const [note, setNote] = useState<string | null>(null);

  function printPdf() {
    const html = buildPrintableHtml(data);
    const win = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
    if (!win) {
      setNote("Consenti i popup per stampare/salvare il PDF.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    window.setTimeout(() => {
      win.print();
    }, 250);
    setNote("Nella finestra di stampa scegli «Salva come PDF».");
  }

  async function openFigma() {
    const url = figmaCvUrl || figmaPortfolioUrl;
    const payload = [
      `CV ottimizzato — ${data.company_name} · ${data.role_title}`,
      "",
      data.optimized_cv_text,
      "",
      "— Lettera —",
      data.cover_letter,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(payload);
      setNote(
        url
          ? "Testo copiato. Apro Figma: incolla nei text node della copia."
          : "Testo copiato. Aggiungi il link Figma nel Profilo per aprirlo da qui.",
      );
    } catch {
      setNote(
        url
          ? "Apro Figma. Copia manualmente CV e lettera dai blocchi sotto."
          : "Aggiungi il link Figma nel Profilo, poi riprova.",
      );
    }

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-4">
      <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
        Crea documenti
      </h3>
      <p className="text-sm text-[var(--muted)]">
        Dopo i suggerimenti puoi esportare subito in PDF o passare a Figma.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={printPdf}>
          Crea PDF
        </button>
        <button type="button" className="btn-secondary" onClick={openFigma}>
          Apri in Figma
        </button>
      </div>
      {note ? (
        <p className="text-xs text-[var(--muted)]" role="status">
          {note}
        </p>
      ) : null}
    </section>
  );
}

function buildPrintableHtml(data: ApplicationPackage) {
  const escape = (s: string) =>
    s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>${escape(data.company_name)} — ${escape(data.role_title)}</title>
  <style>
    body { font-family: Georgia, serif; color: #12263a; margin: 40px; line-height: 1.45; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    h2 { font-size: 16px; margin: 28px 0 8px; border-bottom: 1px solid #d5e0e6; padding-bottom: 4px; }
    pre { white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 12px; }
    p, li { font-size: 13px; }
    .muted { color: #5a6b7b; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${escape(data.company_name)} · ${escape(data.role_title)}</h1>
  <p class="muted">Candidatura SuMisura — ${escape(labelPosition(data.position_type))}</p>
  <h2>CV ottimizzato</h2>
  <pre>${escape(data.optimized_cv_text)}</pre>
  <h2>Lettera motivazionale</h2>
  <pre>${escape(data.cover_letter)}</pre>
  <h2>Email</h2>
  <pre>${escape(`Oggetto: ${data.email_draft.subject}\n\n${data.email_draft.body}`)}</pre>
</body>
</html>`;
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
