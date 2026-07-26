"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { generateApplicationFromOffer } from "@/app/actions/application";
import { ApplicationResult } from "@/components/application/application-result";
import type { ApplicationPackage } from "@/lib/ai/schema";

const MOCK_OFFERS = [
  {
    id: "bs",
    label: "Bending Spoons",
    text: `Bending Spoons — Frontend Engineer (Milano / hybrid)

Cerchiamo esperienza in React / TypeScript.
Requisiti: TypeScript, performance, Next.js.
Link: https://bendingspoons.com/careers`,
  },
  {
    id: "satispay",
    label: "Satispay stage",
    text: `Satispay — Junior Full Stack (Stage / Tirocinio)

Stage retribuito. Stack: React, Node.js, TypeScript.
API REST e Git.`,
  },
  {
    id: "n26",
    label: "N26",
    text: `N26 — Product Designer / Frontend (Berlin)

Figma, React, TypeScript, design systems.
English required.`,
  },
] as const;

type Props = {
  mockMode?: boolean;
};

export function NewApplicationForm({ mockMode = false }: Props) {
  const [offer, setOffer] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApplicationPackage | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [cvSourceLabel, setCvSourceLabel] = useState<string | null>(null);
  const [figmaWriteLabel, setFigmaWriteLabel] = useState<string | null>(null);
  const [figmaCvUrl, setFigmaCvUrl] = useState<string | null>(null);
  const [figmaPortfolioUrl, setFigmaPortfolioUrl] = useState<string | null>(
    null,
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await generateApplicationFromOffer(offer);
      if (!res.ok) {
        setResult(null);
        setApplicationId(null);
        setCvSourceLabel(null);
        setFigmaWriteLabel(null);
        setFigmaCvUrl(null);
        setFigmaPortfolioUrl(null);
        setError(res.error);
        return;
      }
      setResult(res.data);
      setApplicationId(res.applicationId);
      setCvSourceLabel(res.cvSourceLabel);
      setFigmaWriteLabel(res.figmaWriteLabel);
      setFigmaCvUrl(res.figmaCvUrl);
      setFigmaPortfolioUrl(res.figmaPortfolioUrl);
    });
  }

  return (
    <div className="space-y-8">
      {mockMode ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            Offerte mock
          </p>
          <div className="flex flex-wrap gap-2">
            {MOCK_OFFERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="btn-secondary text-sm"
                onClick={() => {
                  setOffer(item.text);
                  setError(null);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <label htmlFor="offer" className="label-caps">
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
          className="btn-primary w-full sm:w-auto"
          disabled={pending || !offer.trim()}
        >
          {pending
            ? mockMode
              ? "Mock in corso..."
              : "Generazione in corso..."
            : mockMode
              ? "Genera (mock)"
              : "Genera candidatura"}
        </button>
      </form>

      {result && applicationId ? (
        <p className="rounded-md border border-[var(--line)] bg-[var(--tint)] px-3 py-2 text-sm text-[var(--ink)]">
          Salvata in archivio.{" "}
          <Link
            href={`/archivio/${applicationId}`}
            className="text-link"
          >
            Apri dettaglio
          </Link>
        </p>
      ) : null}

      {result ? (
        <ApplicationResult
          data={result}
          cvSourceLabel={cvSourceLabel ?? undefined}
          figmaWriteLabel={figmaWriteLabel ?? undefined}
          figmaCvUrl={figmaCvUrl}
          figmaPortfolioUrl={figmaPortfolioUrl}
        />
      ) : null}
    </div>
  );
}
