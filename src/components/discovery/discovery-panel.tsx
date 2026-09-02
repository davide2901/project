"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import {
  dismissOffer,
  runDiscovery,
  startApplicationFromOffer,
} from "@/app/actions/discovery";
import { OverlaySheet } from "@/components/ui/overlay-sheet";
import { TabLink } from "@/components/layout/tab-link";
import { labelPosition } from "@/lib/application/labels";
import type { DiscoveredOffer } from "@/lib/types/database";

type Props = {
  offers: DiscoveredOffer[];
  profileReady: boolean;
};

type Busy =
  | { kind: "search" }
  | { kind: "apply"; id: string }
  | { kind: "dismiss"; id: string }
  | null;

export function DiscoveryPanel({ offers, profileReady }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [openOffer, setOpenOffer] = useState<DiscoveredOffer | null>(null);

  const closeOffer = useCallback(() => setOpenOffer(null), []);

  function onSearch() {
    setError(null);
    setMessage(null);
    setBusy({ kind: "search" });
    startTransition(async () => {
      const res = await runDiscovery();
      setBusy(null);
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
    setBusy({ kind: "dismiss", id });
    startTransition(async () => {
      const res = await dismissOffer(id);
      setBusy(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpenOffer((prev) => (prev?.id === id ? null : prev));
      router.refresh();
    });
  }

  function onApply(id: string) {
    setError(null);
    setBusy({ kind: "apply", id });
    startTransition(async () => {
      const res = await startApplicationFromOffer(id);
      setBusy(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpenOffer(null);
      router.push(`/archivio/${res.applicationId}`);
    });
  }

  const searching = busy?.kind === "search";
  const showEmptyHint =
    offers.length === 0 &&
    profileReady &&
    !searching &&
    !error &&
    !message;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            Offerte per te
          </h2>
          <p className="max-w-prose text-sm leading-relaxed text-[var(--muted)]">
            Tocca una proposta per i dettagli, poi genera CV e lettera.
          </p>
        </div>
        {profileReady ? (
          <button
            type="button"
            className="btn-primary btn-stack-mobile"
            disabled={pending}
            onClick={onSearch}
          >
            {busy?.kind === "search" ? "Ricerca in corso…" : "Cerca offerte"}
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
      {busy?.kind === "search" ? (
        <p className="text-sm text-[var(--muted)]" role="status">
          Sto cercando offerte allineate al tuo profilo…
        </p>
      ) : null}

      {showEmptyHint ? (
        <p className="text-sm text-[var(--muted)]">
          Nessuna proposta ancora. Tocca &quot;Cerca offerte&quot;.
        </p>
      ) : null}

      <ul className="space-y-3">
        {offers.map((offer) => (
          <li key={offer.id}>
            <button
              type="button"
              onClick={() => setOpenOffer(offer)}
              className="flex w-full items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 text-left shadow-[var(--shadow)] transition active:bg-[var(--tint)]"
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
              <span aria-hidden className="mt-1 text-[var(--muted)]">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>

      <OverlaySheet
        open={openOffer != null}
        title={openOffer ? openOffer.company_name : ""}
        onClose={closeOffer}
        footer={
          openOffer ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn-primary w-full text-sm"
                disabled={pending}
                onClick={() => onApply(openOffer.id)}
              >
                {busy?.kind === "apply" && busy.id === openOffer.id
                  ? "Generazione…"
                  : "Genera candidatura"}
              </button>
              <button
                type="button"
                className="btn-secondary w-full text-sm"
                disabled={pending}
                onClick={() => onDismiss(openOffer.id)}
              >
                {busy?.kind === "dismiss" && busy.id === openOffer.id
                  ? "Nascondo…"
                  : "Nascondi"}
              </button>
            </div>
          ) : null
        }
      >
        {openOffer ? (
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-[var(--ink)]">
                {openOffer.role_title}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {labelPosition(openOffer.position_type)}
                {openOffer.location ? ` · ${openOffer.location}` : ""}
              </p>
            </div>
            {openOffer.snippet ? (
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                {openOffer.snippet}
              </p>
            ) : null}
            {openOffer.match_reason ? (
              <p className="rounded-lg bg-[var(--tint)] px-3 py-2 text-sm leading-relaxed text-[var(--ink)]">
                <span className="font-semibold">Perché per te: </span>
                {openOffer.match_reason}
              </p>
            ) : null}
            {openOffer.source_url ? (
              <a
                href={openOffer.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-link inline-flex min-h-10 items-center text-sm"
              >
                Apri fonte
              </a>
            ) : null}
          </div>
        ) : null}
      </OverlaySheet>
    </section>
  );
}
