"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  dismissOffer,
  runDiscovery,
  startApplicationFromOffer,
} from "@/app/actions/discovery";
import { TabLink } from "@/components/layout/tab-link";
import { labelPosition } from "@/lib/application/labels";
import type { DiscoveredOffer } from "@/lib/types/database";

type Props = {
  offers: DiscoveredOffer[];
  profileReady: boolean;
};

export function DiscoveryPanel({ offers, profileReady }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  function toggleOffer(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  function onSearch() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await runDiscovery();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(
        [
          res.inserted > 0
            ? `Trovate ${res.inserted} nuove offerte.`
            : "Nessuna nuova offerta (già presenti o nessun match).",
          res.removedDuplicates > 0
            ? `Rimossi ${res.removedDuplicates} duplicati.`
            : null,
        ]
          .filter(Boolean)
          .join(" "),
      );
      router.refresh();
    });
  }

  function onDismiss(id: string) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await dismissOffer(id);
      setBusyId(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpenId((prev) => (prev === id ? null : prev));
      router.refresh();
    });
  }

  function onApply(id: string) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await startApplicationFromOffer(id);
      setBusyId(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/archivio/${res.applicationId}`);
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            Offerte per te
          </h2>
          <p className="max-w-prose text-sm leading-relaxed text-[var(--muted)]">
            Tocca una proposta, leggi perché ti è adatta, poi genera CV e
            lettera.
          </p>
        </div>
        {profileReady ? (
          <button
            type="button"
            className="btn-primary btn-stack-mobile"
            disabled={pending}
            onClick={onSearch}
          >
            {pending && !busyId ? "Ricerca in corso…" : "Cerca offerte"}
          </button>
        ) : (
          <TabLink tab="profilo" className="btn-secondary btn-stack-mobile">
            Completa il profilo
          </TabLink>
        )}
      </div>

      {error ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="rounded-xl border border-[var(--line)] bg-[var(--tint)] px-3 py-3 text-sm text-[var(--ink)]"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {offers.length === 0 && profileReady ? (
        <p className="text-sm text-[var(--muted)]">
          Nessuna proposta ancora. Tocca &quot;Cerca offerte&quot;.
        </p>
      ) : null}

      <ul className="space-y-3">
        {offers.map((offer) => {
          const open = openId === offer.id;
          const panelId = `offer-panel-${offer.id}`;
          return (
            <li
              key={offer.id}
              className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
            >
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggleOffer(offer.id)}
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition active:bg-[var(--tint)]"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-semibold text-[var(--ink)]">
                    {offer.company_name}
                  </p>
                  <p className="truncate text-sm text-[var(--ink)]">
                    {offer.role_title}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {labelPosition(offer.position_type)}
                    {offer.location ? ` · ${offer.location}` : ""}
                  </p>
                </div>
                <span
                  aria-hidden
                  className={`mt-1 shrink-0 text-[var(--muted)] transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
              </button>

              {open ? (
                <div
                  id={panelId}
                  className="space-y-3 border-t border-[var(--line)] px-4 py-3.5"
                >
                  {offer.snippet ? (
                    <p className="text-sm leading-relaxed text-[var(--muted)]">
                      {offer.snippet}
                    </p>
                  ) : null}
                  {offer.match_reason ? (
                    <p className="rounded-lg bg-[var(--tint)] px-3 py-2 text-sm leading-relaxed text-[var(--ink)]">
                      <span className="font-semibold">Perché per te: </span>
                      {offer.match_reason}
                    </p>
                  ) : null}
                  {offer.source_url ? (
                    <a
                      href={offer.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link inline-flex min-h-10 items-center text-sm"
                    >
                      Apri fonte
                    </a>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      className="btn-primary w-full text-sm"
                      disabled={pending || busyId === offer.id}
                      onClick={() => onApply(offer.id)}
                    >
                      {busyId === offer.id
                        ? "Generazione…"
                        : "Genera candidatura"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary w-full text-sm"
                      disabled={pending}
                      onClick={() => onDismiss(offer.id)}
                    >
                      Nascondi
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
