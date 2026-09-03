"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";

import {
  dismissOffer,
  setOfferWatching,
  startApplicationFromOffer,
} from "@/app/actions/discovery";
import type { RunDiscoveryResult } from "@/app/actions/discovery";
import { OfferExternalLink } from "@/components/discovery/offer-external-link";
import { OfferFiltersBar } from "@/components/discovery/offer-filters-bar";
import { OfferSalaryLine } from "@/components/discovery/offer-salary-line";
import { OverlaySheet } from "@/components/ui/overlay-sheet";
import { TabLink } from "@/components/layout/tab-link";
import { labelPosition } from "@/lib/application/labels";
import {
  DEFAULT_OFFER_FILTERS,
  filterAndSortOffers,
  offerFiltersActive,
  type OfferListFilters,
} from "@/lib/discovery/offer-filters";
import type { DiscoveredOffer } from "@/lib/types/database";

type Props = {
  offers: DiscoveredOffer[];
  profileReady: boolean;
  skills?: string[];
  companiesOfInterest?: string[];
};

type Busy =
  | { kind: "search" }
  | { kind: "apply"; id: string }
  | { kind: "dismiss"; id: string }
  | { kind: "watch"; id: string }
  | null;

export function DiscoveryPanel({
  offers,
  profileReady,
  skills = [],
  companiesOfInterest = [],
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [openOffer, setOpenOffer] = useState<DiscoveredOffer | null>(null);
  const [filters, setFilters] = useState<OfferListFilters>(DEFAULT_OFFER_FILTERS);

  const closeOffer = useCallback(() => setOpenOffer(null), []);

  function onSearch() {
    setError(null);
    setMessage(null);
    setBusy({ kind: "search" });
    startTransition(async () => {
      let res: RunDiscoveryResult;
      try {
        // Route dedicata con maxDuration=60 (le server action Hobby tagliano a ~10s).
        const response = await fetch("/api/discovery", {
          method: "POST",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        res = (await response.json()) as RunDiscoveryResult;
        if (!response.ok && res && typeof res === "object" && "ok" in res) {
          // body già tipizzato
        } else if (!response.ok) {
          res = {
            ok: false,
            error:
              "Ricerca offerte non disponibile al momento. Riprova tra poco.",
          };
        }
      } catch {
        setBusy(null);
        setError(
          "Ricerca interrotta (timeout o rete). Riprova tra poco.",
        );
        return;
      }
      setBusy(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(
        [
          res.inserted > 0
            ? `Trovate ${res.inserted} nuove offerte.`
            : "Nessuna nuova offerta da aggiungere.",
          res.skipped > 0 ? `Ignorate ${res.skipped} già viste o scartate.` : null,
          res.removedDuplicates > 0
            ? `Rimossi ${res.removedDuplicates} duplicati.`
            : null,
          res.degraded === "quota"
            ? "Attenzione: ricerca web in quota Gemini; risultati senza Google Search."
            : res.degraded === "no_grounding"
              ? "Attenzione: ricerca web non disponibile."
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

  function onWatch(id: string, watching: boolean) {
    setError(null);
    setBusy({ kind: "watch", id });
    startTransition(async () => {
      const res = await setOfferWatching(id, watching);
      setBusy(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpenOffer((prev) =>
        prev?.id === id
          ? { ...prev, status: watching ? "watching" : "new" }
          : prev,
      );
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

  const visible = useMemo(
    () =>
      filterAndSortOffers(offers, filters, {
        skills,
        companiesOfInterest,
      }),
    [offers, filters, skills, companiesOfInterest],
  );
  const watching = visible.filter((o) => o.status === "watching");
  const inbox = visible.filter((o) => o.status === "new");
  const searching = busy?.kind === "search";
  const filtersOn = offerFiltersActive(filters);
  const showEmptyHint =
    offers.length === 0 &&
    profileReady &&
    !searching &&
    !error &&
    !message;
  const showFilterEmpty =
    offers.length > 0 && visible.length === 0 && !searching;

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Offerte
          </h2>
          {profileReady ? (
            <button
              type="button"
              className="btn-primary shrink-0 px-3 text-sm"
              disabled={pending}
              onClick={onSearch}
            >
              {busy?.kind === "search" ? "Cerco…" : "Cerca"}
            </button>
          ) : (
            <TabLink tab="profilo" className="btn-secondary shrink-0 px-3 text-sm">
              CV
            </TabLink>
          )}
        </div>
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

      {offers.length > 0 ? (
        <OfferFiltersBar
          filters={filters}
          onChange={setFilters}
          resultCount={visible.length}
          totalCount={offers.length}
        />
      ) : null}

      {showEmptyHint ? (
        <p className="text-sm text-[var(--muted)]">
          Nessuna proposta ancora. Tocca &quot;Cerca offerte&quot;.
        </p>
      ) : null}

      {showFilterEmpty ? (
        <p className="text-sm text-[var(--muted)]">
          Nessuna offerta con questi filtri.
          {filtersOn ? " Prova ad azzerarli." : ""}
        </p>
      ) : null}

      {watching.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--ink)]">
            Da tenere d&apos;occhio
          </h3>
          <OfferList offers={watching} onOpen={setOpenOffer} watching />
        </div>
      ) : null}

      {inbox.length > 0 ? (
        <div className="space-y-2">
          {watching.length > 0 ? (
            <h3 className="text-sm font-semibold text-[var(--ink)]">
              Nuove proposte
            </h3>
          ) : null}
          <OfferList offers={inbox} onOpen={setOpenOffer} />
        </div>
      ) : null}

      <OverlaySheet
        open={openOffer != null}
        title={openOffer ? openOffer.company_name : ""}
        onClose={closeOffer}
        footer={
          openOffer ? (
            <div className="flex flex-col gap-2">
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
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="btn-secondary w-full text-sm"
                  disabled={pending}
                  onClick={() =>
                    onWatch(openOffer.id, openOffer.status !== "watching")
                  }
                >
                  {busy?.kind === "watch" && busy.id === openOffer.id
                    ? "Salvo…"
                    : openOffer.status === "watching"
                      ? "Togli dalla lista"
                      : "Tieni d'occhio"}
                </button>
                <button
                  type="button"
                  className="btn-secondary w-full text-sm"
                  disabled={pending}
                  onClick={() => onDismiss(openOffer.id)}
                >
                  {busy?.kind === "dismiss" && busy.id === openOffer.id
                    ? "Scarto…"
                    : "Scarta"}
                </button>
              </div>
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
            {openOffer.status === "watching" ? (
              <p className="text-xs font-medium text-[var(--ink)]">
                In lista da tenere d&apos;occhio
              </p>
            ) : null}
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
            <OfferSalaryLine offer={openOffer} variant="detail" />
            <OfferExternalLink offer={openOffer} variant="detail" />
          </div>
        ) : null}
      </OverlaySheet>
    </section>
  );
}

function OfferList({
  offers,
  onOpen,
  watching = false,
}: {
  offers: DiscoveredOffer[];
  onOpen: (offer: DiscoveredOffer) => void;
  watching?: boolean;
}) {
  return (
    <ul className="space-y-3">
      {offers.map((offer) => (
        <li key={offer.id}>
          <button
            type="button"
            onClick={() => onOpen(offer)}
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
                {watching ? "In lista · " : ""}
                {labelPosition(offer.position_type)}
                {offer.location ? ` · ${offer.location}` : ""}
                <OfferSalaryLine offer={offer} variant="card" />
              </p>
            </div>
            <OfferExternalLink offer={offer} variant="card" stopPropagation />
          </button>
        </li>
      ))}
    </ul>
  );
}
