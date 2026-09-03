"use client";

import { useState, useTransition } from "react";

import { getCompanyIntel } from "@/app/actions/company-intel";
import type { CompanyIntelPayload } from "@/lib/ai/company-intel-schema";
import { OverlaySheet } from "@/components/ui/overlay-sheet";

const SIGNAL_LABEL: Record<CompanyIntelPayload["overall_signal"], string> = {
  positivo: "Clima positivo",
  misto: "Clima misto",
  critico: "Segnali critici",
  insufficiente: "Poche fonti",
};

type Props = {
  companyName: string;
  roleTitle: string;
  location?: string | null;
  offerId?: string | null;
};

export function OfferInterviewPrep({
  companyName,
  roleTitle,
  location,
  offerId,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<CompanyIntelPayload | null>(null);
  const [open, setOpen] = useState(false);
  const [cached, setCached] = useState(false);

  function load(force = false) {
    setError(null);
    startTransition(async () => {
      const res = await getCompanyIntel({
        companyName,
        roleTitle,
        location,
        offerId,
        forceRefresh: force,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPayload(res.payload);
      setCached(res.cached);
      setOpen(true);
    });
  }

  return (
    <div className="space-y-2">
      {payload && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--tint)] px-3 py-2 text-left text-sm text-[var(--ink)] transition active:opacity-90"
        >
          <span className="font-semibold">
            {SIGNAL_LABEL[payload.overall_signal]}
          </span>
          <span className="mt-0.5 block text-[var(--muted)]">
            {payload.one_liner}
          </span>
          <span className="mt-1 inline-block text-link text-xs">
            Prepara il colloquio ›
          </span>
        </button>
      ) : (
        <button
          type="button"
          className="text-link inline-flex min-h-10 items-center text-sm font-medium"
          disabled={pending}
          onClick={() => load(false)}
        >
          {pending ? "Cerco opinioni e fonti…" : "Prepara il colloquio"}
        </button>
      )}

      {error ? (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <OverlaySheet
        open={open && payload != null}
        title="Prepara il colloquio"
        onClose={() => setOpen(false)}
        zIndex={90}
      >
        {payload ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                {SIGNAL_LABEL[payload.overall_signal]}
                {" · "}
                affidabilità {payload.confidence}
                {cached ? " · cache" : ""}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--ink)]">
                {payload.one_liner}
              </p>
            </div>

            {payload.pros.length > 0 ? (
              <section>
                <h3 className="text-sm font-semibold text-[var(--ink)]">Pro</h3>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-[var(--muted)]">
                  {payload.pros.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {payload.cons.length > 0 ? (
              <section>
                <h3 className="text-sm font-semibold text-[var(--ink)]">
                  Contro / attenzione
                </h3>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-[var(--muted)]">
                  {payload.cons.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {payload.interview_tips.length > 0 ? (
              <section>
                <h3 className="text-sm font-semibold text-[var(--ink)]">
                  Consigli per il colloquio
                </h3>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-[var(--muted)]">
                  {payload.interview_tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {payload.salary_hint?.min && payload.salary_hint?.max ? (
              <p className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-xs text-[var(--muted)]">
                RAL indicativa da fonti pubbliche:{" "}
                {Math.round(payload.salary_hint.min / 1000)}–
                {Math.round(payload.salary_hint.max / 1000)}k € — non certa.
                {payload.salary_hint.note
                  ? ` ${payload.salary_hint.note}`
                  : ""}
              </p>
            ) : null}

            {payload.sources.length > 0 ? (
              <section>
                <h3 className="text-sm font-semibold text-[var(--ink)]">
                  Fonti
                </h3>
                <ul className="mt-1 space-y-1.5">
                  {payload.sources.map((s) => (
                    <li key={`${s.label}-${s.url ?? ""}`} className="text-sm">
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-link"
                        >
                          {s.label} ↗
                        </a>
                      ) : (
                        <span className="text-[var(--muted)]">{s.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="text-xs text-[var(--muted)]">
                Nessun link fonte disponibile; verifica tu su Glassdoor / LinkedIn.
              </p>
            )}

            <button
              type="button"
              className="btn-secondary w-full text-sm"
              disabled={pending}
              onClick={() => load(true)}
            >
              {pending ? "Aggiorno…" : "Aggiorna ricerca"}
            </button>
          </div>
        ) : null}
      </OverlaySheet>
    </div>
  );
}
