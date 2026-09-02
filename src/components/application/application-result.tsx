"use client";

import { useCallback, useState, useTransition } from "react";

import { updateApplicationStatus } from "@/app/actions/application";
import { OverlaySheet } from "@/components/ui/overlay-sheet";
import type { ApplicationPackage } from "@/lib/ai/schema";
import { buildCvPrintHtml } from "@/lib/cv/european-cv-template";
import { generateEuropassDocx, downloadBlob } from "@/lib/cv/europass-docx";
import { resolveEuropeanCv } from "@/lib/cv/parse-cv-text";
import {
  APPLICATION_STATUS_OPTIONS,
  labelPosition,
  labelStatus,
  normalizeStatus,
} from "@/lib/application/labels";
import type { ApplicationStatus } from "@/lib/types/database";

type DocKey = "cv" | "letter" | "email" | "notes" | "ats" | "skills" | "gaps" | "company";

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
  const [openDoc, setOpenDoc] = useState<DocKey | null>(null);
  const close = useCallback(() => setOpenDoc(null), []);

  const docs: {
    key: DocKey;
    title: string;
    preview: string;
    body: string;
    list?: string[];
    chips?: string[];
  }[] = [
    {
      key: "cv",
      title: "CV (formato europeo)",
      preview: "Tocca per leggere e copiare il CV ottimizzato per questa offerta.",
      body: data.optimized_cv_text,
    },
    {
      key: "letter",
      title: "Lettera motivazionale",
      preview: "Tocca per aprire la lettera.",
      body: data.cover_letter,
    },
    {
      key: "email",
      title: "Bozza email",
      preview: data.email_draft.subject || "Tocca per aprire la bozza.",
      body: `Oggetto: ${data.email_draft.subject}\n\n${data.email_draft.body}`,
    },
    ...(data.honesty_notes.length
      ? [
          {
            key: "notes" as const,
            title: "Note di trasparenza",
            preview: `${data.honesty_notes.length} note · tocchi per leggere`,
            body: data.honesty_notes.map((n) => `• ${n}`).join("\n"),
            list: data.honesty_notes,
          },
        ]
      : []),
  ];

  const analysis: {
    key: DocKey;
    title: string;
    preview: string;
    body: string;
    list?: string[];
    chips?: string[];
  }[] = [
    {
      key: "ats",
      title: "Keyword ATS",
      preview: data.ats_keywords.length
        ? data.ats_keywords.slice(0, 4).join(" · ")
        : "Nessuna keyword",
      body: data.ats_keywords.join(" · ") || "Nessuna keyword",
      chips: data.ats_keywords,
    },
    {
      key: "skills",
      title: "Competenze allineate",
      preview: data.matched_skills.length
        ? data.matched_skills.slice(0, 4).join(" · ")
        : "Nessuna",
      body: data.matched_skills.join(" · ") || "Nessuna",
      chips: data.matched_skills,
    },
    {
      key: "gaps",
      title: "Requisiti non coperti",
      preview: data.omitted_offer_requirements.length
        ? `${data.omitted_offer_requirements.length} requisiti`
        : "Nessuno evidenziato",
      body: data.omitted_offer_requirements.length
        ? data.omitted_offer_requirements.map((r) => `• ${r}`).join("\n")
        : "Nessuno evidenziato",
    },
    {
      key: "company",
      title: "Ricerca azienda",
      preview: data.company_research.summary.slice(0, 90) + (data.company_research.summary.length > 90 ? "…" : ""),
      body: [
        data.company_research.summary,
        "",
        ...data.company_research.facts.map((f) => `${f.label}: ${f.value}`),
        data.company_research.unavailable_notes.length
          ? `\nNon reperibile: ${data.company_research.unavailable_notes.join(" · ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  const active =
    openDoc == null
      ? null
      : [...docs, ...analysis].find((d) => d.key === openDoc) ?? null;

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

      <section className="space-y-3">
        <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
          Documenti
        </h3>
        <p className="text-sm text-[var(--muted)]">
          Tocca una voce per aprirla a schermo intero.
        </p>
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li key={doc.key}>
              <DocRow
                title={doc.title}
                preview={doc.preview}
                onOpen={() => setOpenDoc(doc.key)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
          Analisi
        </h3>
        <ul className="space-y-2">
          {analysis.map((doc) => (
            <li key={doc.key}>
              <DocRow
                title={doc.title}
                preview={doc.preview}
                onOpen={() => setOpenDoc(doc.key)}
              />
            </li>
          ))}
        </ul>
      </section>

      <OverlaySheet
        open={active != null}
        title={active?.title ?? ""}
        onClose={close}
        footer={
          active ? (
            <CopyButton text={active.body} fullWidth />
          ) : null
        }
      >
        {active?.list ? (
          <ul className="space-y-2 text-sm leading-relaxed text-[var(--ink)]">
            {active.list.map((n: string) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
        ) : active?.chips?.length ? (
          <ul className="flex flex-wrap gap-2">
            {active.chips.map((c: string) => (
              <li
                key={c}
                className="rounded-full border border-[var(--line)] bg-[var(--tint)] px-3 py-1.5 text-sm text-[var(--ink)]"
              >
                {c}
              </li>
            ))}
          </ul>
        ) : active?.key === "company" ? (
          <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
            <p className="text-[var(--muted)]">{data.company_research.summary}</p>
            <ul className="space-y-2">
              {data.company_research.facts.map((fact) => (
                <li
                  key={`${fact.label}-${fact.value}`}
                  className="rounded-xl border border-[var(--line)] bg-[var(--tint)] px-3 py-3"
                >
                  <span className="font-medium">{fact.label}</span>
                  <p className="mt-1">{fact.value}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--ink)]">
            {active?.body}
          </div>
        )}
      </OverlaySheet>
    </div>
  );
}

function DocRow({
  title,
  preview,
  onOpen,
}: {
  title: string;
  preview: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 text-left shadow-[var(--shadow)] transition active:bg-[var(--tint)]"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[var(--ink)]">{title}</p>
        <p className="mt-0.5 truncate text-sm text-[var(--muted)]">{preview}</p>
      </div>
      <span aria-hidden className="text-[var(--muted)]">
        ›
      </span>
    </button>
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

  const [busy, setBusy] = useState<"pdf" | "docx" | null>(null);

  function printPdf() {
    const cv = resolveEuropeanCv(data);
    if (!cv) {
      setNote("CV non disponibile per l'esportazione.");
      return;
    }
    setBusy("pdf");
    const html = buildCvPrintHtml(cv, `CV ${data.role_title}`, window.location.origin);
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "CV PDF SuMisura");
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
      setBusy(null);
      setNote("Impossibile aprire l'anteprima di stampa. Riprova.");
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    window.setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setNote('Nella finestra di stampa scegli «Salva come PDF».');
      } catch {
        setNote("Stampa non riuscita. Riprova.");
      } finally {
        setBusy(null);
        window.setTimeout(() => {
          if (iframe.parentNode) document.body.removeChild(iframe);
        }, 1500);
      }
    }, 300);
  }

  async function downloadDocx() {
    const cv = resolveEuropeanCv(data);
    if (!cv) {
      setNote("CV non disponibile per l'esportazione.");
      return;
    }
    setBusy("docx");
    try {
      const blob = await generateEuropassDocx(cv);
      const safeName = cv.full_name.replace(/[^\w\s-]/g, "").trim() || "CV";
      downloadBlob(blob, `CV-${safeName}.docx`);
      setNote("CV Europass scaricato in Word (.docx).");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Download Word non riuscito.");
    } finally {
      setBusy(null);
    }
  }

  async function openFigma() {
    const url = figmaCvUrl || figmaPortfolioUrl;
    try {
      await navigator.clipboard.writeText(data.optimized_cv_text);
      setNote(
        url
          ? "CV copiato. Apro Figma: incolla oppure usa il plugin."
          : "CV copiato. Aggiungi il link Figma in Profilo → Avanzate.",
      );
    } catch {
      setNote(
        url
          ? "Apro Figma. Copia il CV dalla scheda Documenti."
          : "Aggiungi il link Figma in Profilo → Avanzate.",
      );
    }
    if (url) window.open(url, "_blank", "noopener,noreferrer");
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
        Esporta CV
      </h3>
      <p className="text-sm text-[var(--muted)]">
        Esporta con il template Europass. Nel dialogo di stampa PDF disattiva
        «Intestazioni e piè di pagina» per un layout pulito.
      </p>
      <button
        type="button"
        className="btn-primary w-full"
        onClick={printPdf}
        disabled={busy != null}
      >
        {busy === "pdf" ? "Preparazione PDF…" : "Scarica CV in PDF"}
      </button>
      <button
        type="button"
        className="btn-secondary w-full"
        onClick={downloadDocx}
        disabled={busy != null}
      >
        {busy === "docx" ? "Preparazione Word…" : "Scarica CV in Word (.docx)"}
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

function CopyButton({
  text,
  fullWidth,
}: {
  text: string;
  fullWidth?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={
        fullWidth
          ? "btn-secondary w-full"
          : "text-link inline-flex min-h-10 items-center text-sm active:opacity-70"
      }
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copiato" : "Copia testo"}
    </button>
  );
}
