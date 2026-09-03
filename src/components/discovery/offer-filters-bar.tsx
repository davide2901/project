"use client";

import { useState } from "react";

import type {
  OfferListFilters,
  OfferSalaryFilter,
  OfferSort,
  OfferTypeFilter,
  OfferWorkModeFilter,
} from "@/lib/discovery/offer-filters";
import { offerFiltersActive } from "@/lib/discovery/offer-filters";

type Props = {
  filters: OfferListFilters;
  onChange: (next: OfferListFilters) => void;
  resultCount: number;
  totalCount: number;
};

export function OfferFiltersBar({
  filters,
  onChange,
  resultCount,
  totalCount,
}: Props) {
  const extraOn =
    filters.type !== "all" ||
    filters.workMode !== "all" ||
    filters.salary !== "all";
  const [open, setOpen] = useState(extraOn);
  const showExtra = open || extraOn;
  const active = offerFiltersActive(filters);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Ordina</span>
          <select
            className="field field-compact"
            value={filters.sort}
            onChange={(e) =>
              onChange({ ...filters, sort: e.target.value as OfferSort })
            }
          >
            <option value="recent">Recenti</option>
            <option value="popular">Popolari</option>
            <option value="affinity_desc">Più affini</option>
            <option value="affinity_asc">Meno affini</option>
            <option value="ral_desc">RAL ↓</option>
            <option value="ral_asc">RAL ↑</option>
          </select>
        </label>
        <button
          type="button"
          className={`btn-secondary shrink-0 px-3 text-sm ${extraOn ? "ring-1 ring-[var(--accent)]" : ""}`}
          aria-expanded={showExtra}
          onClick={() => setOpen((v) => !v)}
        >
          Filtri
        </button>
      </div>

      {showExtra ? (
        <div className="grid grid-cols-2 gap-2">
          <select
            className="field field-compact"
            aria-label="Tipo"
            value={filters.type}
            onChange={(e) =>
              onChange({ ...filters, type: e.target.value as OfferTypeFilter })
            }
          >
            <option value="all">Tipo: tutti</option>
            <option value="lavoro">Lavoro</option>
            <option value="stage">Stage</option>
            <option value="non_chiaro">Non chiaro</option>
          </select>
          <select
            className="field field-compact"
            aria-label="Modalità"
            value={filters.workMode}
            onChange={(e) =>
              onChange({
                ...filters,
                workMode: e.target.value as OfferWorkModeFilter,
              })
            }
          >
            <option value="all">Luogo: tutti</option>
            <option value="remote">Remoto</option>
            <option value="hybrid">Ibrido</option>
            <option value="onsite">In sede</option>
          </select>
          <select
            className="field field-compact col-span-2"
            aria-label="Dettaglio"
            value={filters.salary}
            onChange={(e) =>
              onChange({
                ...filters,
                salary: e.target.value as OfferSalaryFilter,
              })
            }
          >
            <option value="all">RAL e link: tutti</option>
            <option value="known">Con RAL</option>
            <option value="annuncio">RAL da annuncio</option>
            <option value="missing">Senza RAL</option>
            <option value="with_link">Con link</option>
          </select>
          {active ? (
            <div className="col-span-2 flex items-center justify-between">
              <p className="text-xs text-[var(--muted)]">
                {resultCount}/{totalCount}
              </p>
              <button
                type="button"
                className="text-link text-xs font-medium"
                onClick={() => {
                  onChange({
                    sort: "recent",
                    type: "all",
                    workMode: "all",
                    salary: "all",
                  });
                  setOpen(false);
                }}
              >
                Azzera
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
