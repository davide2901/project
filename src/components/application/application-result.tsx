"use client";

import { useState, useTransition } from "react";

import { updateApplicationStatus } from "@/app/actions/application";
import type { ApplicationPackage } from "@/lib/ai/schema";
import {
  APPLICATION_STATUS_OPTIONS,
  labelPosition,
  labelStatus,
  normalizeStatus,
} from "@/lib/application/labels";
import type { ApplicationStatus } from "@/lib/types/database";

type DetailTab = "documenti" | "analisi" | "azienda";

export function ApplicationResult({
  data,
  applicationId,
  initialStatus,
  cvSourceLabel,
  figmaCvUrl,
  figmaPortfolioUrl,
  figmaSyncCode,
}: {
  data: ApplicationPackage;
  applicationId?: string;
  initialStatus?: ApplicationStatus;
  cvSourceLabel?: string;
  figmaCvUrl?: string | null;
  figmaPortfolioUrl?: string | null;
  figmaSyncCode?: string | null;
}) {
  const [tab, setTab] = useState<DetailTab>("documenti");

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="space-y-2">
        <p className="label-caps">Candidatura</p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          {data.company_name}
        </h2>
        <p className="text-base text-[var(--ink)]">{data.role_title}</p>
        <p className="text-sm text-[var(--muted)]">
          {labelPosition(data.position_type)}
        </p>
        {cvSourceLabel ? (
          <p className="pt-1 text-xs text-[var(--muted)]">{cvSourceLabel}</p>
        ) : null}
      </header>

      {applicationId && initialStatus ? (
        <StatusPicker applicationId={applicationId} initialStatus={initialStatus} />
      ) : null}

      <ExportActions
        data={data}
        figmaCvUrl={figmaCvUrl ?? null}
        figmaPortfolioUrl={figmaPortfolioUrl ?? null}
        figmaSyncCode={figmaSyncCode ?? null}
      />

      <div
        role="tablist"
        aria-label="Sezioni candidatura"
        className="flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1"
      >
        {(
          [
            { id: "documenti", label: "Documenti" },
            { id: "analisi", label: "Analisi" },
            { id: "azienda", label: "Azienda" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`min-h-11 flex-1 rounded-lg px-2 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-[var(--btn)] text-white"
                : "text-[var(--ink)] active:bg-[var(--tint)]"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "documenti" ? (
        <div className="space-y-6" role="tabpanel">
          <ResultBlock title="CV ottimizzato" body={data.optimized_cv_text} />
          <ResultBlock title="Lettera motivazionale" body={data.cover_letter} />
          <ResultBlock
            title="Bozza email"
            body={`Oggetto: ${data.email_draft.subject}\n\n${data.email_draft.body}`}
          />
          {data.honesty_notes.length ? (
            <details className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--ink)]">
                Note di trasparenza
              </summary>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--muted)]">
                {data.honesty_notes.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {tab === "analisi" ? (
        <div className="space-y-6" role="tabpanel">
          <ChipBlock
            title="Keyword ATS"
            items={data.ats_keywords}
            empty="Nessuna keyword"
          />
          <ChipBlock
            title="Competenze allineate (dal tuo CV)"
            items={data.matched_skills}
            empty="Nessuna competenza allineata"
          />
          <ResultBlock
            title="Requisiti offerta non coperti"
            body={
              data.omitted_offer_requirements.length
                ? data.omitted_offer_requirements.map((r) => `• ${r}`).join("\n")
                : "Nessuno evidenziato"
            }
          />
        </div>
      ) : null}

      {tab === "azienda" ? (
        <div className="space-y-4" role="tabpanel">
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {data.company_research.summary}
          </p>
          <ul className="space-y-2 text-sm">
            {data.company_research.facts.map((fact) => (
              <li
                key={`${fact.label}-${fact.value}`}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3"
              >
                <span className="font-medium text-[var(--ink)]">{fact.label}</span>
                <p className="mt-1 text-[var(--ink)]">{fact.value}</p>
              </li>
            ))}
          </ul>
          {data.company_research.unavailable_notes.length ? (
            <p className="text-xs text-[var(--muted)]">
              Non reperibile:{" "}
              {data.company_research.unavailable_notes.join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StatusPicker({
  applicationId,
  initialStatus,
}: {
  applicationId: string;
  initialStatus: ApplicationStatus;
}) {
  const [status, setStatus] = useState(normalizeStatus(initialStatus));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(next: ApplicationStatus) {
    setError(null);
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      const res = await updateApplicationStatus(applicationId, next);
      if (!res.ok) {
        setStatus(prev);
        setError(res.error);
      }
    });
  }

  return (
    <section className="space-y-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
      <label htmlFor="app-status" className="label-caps">
        Stato candidatura
      </label>
      <select
        id="app-status"
        className="field"
        value={status}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as ApplicationStatus)}
      >
        {APPLICATION_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-[var(--muted)]">
        Ora: {labelStatus(status)}
        {pending ? " · salvataggio…" : ""}
      </p>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function ExportActions({
  data,
  figmaCvUrl,
  figmaPortfolioUrl,
  figmaSyncCode,
}: {
  data: ApplicationPackage;
  figmaCvUrl: string | null;
  figmaPortfolioUrl: string | null;
  figmaSyncCode: string | null;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function printPdf() {
    const html = buildPrintableHtml(data);
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "Anteprima PDF SuMisura");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      setNote("Impossibile aprire l'anteprima di stampa. Riprova.");
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const runPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setNote('Nella finestra di stampa scegli «Salva come PDF».');
      } catch {
        setNote("Stampa non riuscita. Riprova.");
      } finally {
        window.setTimeout(() => {
          if (iframe.parentNode) document.body.removeChild(iframe);
        }, 1500);
      }
    };

    // Safari / mobile: load può non arrivare; aspetta un tick
    window.setTimeout(runPrint, 300);
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
          ? "Testo copiato. Apro Figma: incolla oppure usa il plugin."
          : "Testo copiato. Aggiungi il link Figma in Profilo → Avanzate.",
      );
    } catch {
      setNote(
        url
          ? "Apro Figma. Copia CV e lettera dai blocchi sotto."
          : "Aggiungi il link Figma in Profilo → Avanzate.",
      );
    }

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function copySyncCode() {
    if (!figmaSyncCode) return;
    try {
      await navigator.clipboard.writeText(figmaSyncCode);
      setNote("Codice sync copiato. Incollalo nel plugin SuMisura su Figma.");
    } catch {
      setNote(`Codice sync: ${figmaSyncCode}`);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow)]">
      <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
        Esporta
      </h3>
      <p className="text-sm text-[var(--muted)]">
        Scarica i documenti o copiali. Figma è opzionale.
      </p>
      <button type="button" className="btn-primary w-full" onClick={printPdf}>
        Crea PDF
      </button>
      <button
        type="button"
        className="text-link text-sm"
        onClick={() => setAdvancedOpen((v) => !v)}
        aria-expanded={advancedOpen}
      >
        {advancedOpen ? "Nascondi opzioni avanzate" : "Opzioni avanzate · Figma"}
      </button>
      {advancedOpen ? (
        <div className="space-y-2 border-t border-[var(--line)] pt-3">
          <button type="button" className="btn-secondary w-full" onClick={openFigma}>
            Apri in Figma
          </button>
          {figmaSyncCode ? (
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={copySyncCode}
            >
              Copia codice plugin
            </button>
          ) : null}
          <p className="text-xs text-[var(--muted)]">
            Serve un tuo file Figma nel Profilo. Nessuna sync automatica.
          </p>
        </div>
      ) : null}
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
    body { font-family: Georgia, "Times New Roman", serif; color: #0b1f36; margin: 40px; line-height: 1.5; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    h2 { font-size: 15px; margin: 28px 0 10px; border-bottom: 1px solid #d0dae6; padding-bottom: 4px; }
    .body { white-space: pre-wrap; font-family: Georgia, serif; font-size: 13px; }
    .muted { color: #5a6b7c; font-size: 12px; margin: 0 0 20px; }
  </style>
</head>
<body>
  <h1>${escape(data.company_name)} · ${escape(data.role_title)}</h1>
  <p class="muted">Candidatura SuMisura — ${escape(labelPosition(data.position_type))}</p>
  <h2>CV ottimizzato</h2>
  <div class="body">${escape(data.optimized_cv_text)}</div>
  <h2>Lettera motivazionale</h2>
  <div class="body">${escape(data.cover_letter)}</div>
  <h2>Email</h2>
  <div class="body">${escape(`Oggetto: ${data.email_draft.subject}\n\n${data.email_draft.body}`)}</div>
</body>
</html>`;
}

function ChipBlock({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  const text = items.join(" · ") || empty;
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
        <CopyButton text={text} />
      </div>
      {items.length ? (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--ink)]"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">{empty}</p>
      )}
    </section>
  );
}

function ResultBlock({ title, body }: { title: string; body: string }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
        <CopyButton text={body} />
      </div>
      <div className="max-w-full whitespace-pre-wrap break-words rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed text-[var(--ink)]">
        {body}
      </div>
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="text-link inline-flex min-h-10 items-center text-sm active:opacity-70"
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
