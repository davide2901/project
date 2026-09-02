"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SoftDaylightSpot } from "@/components/brand/soft-daylight-spot";
import { TabLink } from "@/components/layout/tab-link";
import {
  APPLICATION_STATUS_OPTIONS,
  companyInitials,
  labelPosition,
  labelStatus,
  normalizeStatus,
} from "@/lib/application/labels";
import type { ApplicationStatus } from "@/lib/types/database";
import type { TabsBootstrap } from "@/lib/tabs/bootstrap";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

type Filter = "all" | ApplicationStatus;

export function ArchiveTabView({ data }: { data: TabsBootstrap["archivio"] }) {
  const { items, error } = data;
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => normalizeStatus(item.status) === filter);
  }, [items, filter]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-[family-name:var(--font-display)] text-[1.85rem] tracking-tight text-[var(--ink)] sm:text-3xl">
          Archivio
        </h1>
        <p className="text-sm text-[var(--muted)]">
          I tuoi documenti di candidatura, pronti da usare.
        </p>
      </header>

      {error ? (
        <p
          className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
          role="alert"
        >
          Impossibile caricare l&apos;archivio. Riprova più tardi.
        </p>
      ) : null}

      {!error && items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-10 text-center">
          <SoftDaylightSpot title="Nessuna candidatura ancora. Generane una su misura dalla Home." />
          <TabLink tab="home" className="mt-6 inline-flex btn-primary">
            Vai alla Home
          </TabLink>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          role="toolbar"
          aria-label="Filtra per stato"
        >
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="Tutte"
          />
          {APPLICATION_STATUS_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              active={filter === opt.value}
              onClick={() => setFilter(opt.value)}
              label={opt.label}
            />
          ))}
        </div>
      ) : null}

      {items.length > 0 && filtered.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          Nessuna candidatura con questo stato.
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link
                href={`/archivio/${item.id}`}
                className="flex min-h-[4.5rem] gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3.5 shadow-[var(--shadow)] transition active:bg-[var(--tint)] sm:hover:border-[color-mix(in_oklab,var(--accent)_35%,var(--line))]"
              >
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--tint)] font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--ink)]"
                  aria-hidden
                >
                  {companyInitials(item.company_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--ink)]">
                        {item.company_name}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-[var(--ink)]">
                        {item.role_title}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--muted)]">
                        {labelPosition(item.position_type)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
                        <span className="status-dot" aria-hidden />
                        <span className="text-[var(--ink)]">
                          {labelStatus(item.status)}
                        </span>
                      </p>
                      <time
                        dateTime={item.created_at}
                        className="mt-2 block text-xs text-[var(--muted)]"
                      >
                        {formatDate(item.created_at)}
                      </time>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-[var(--btn)] bg-[var(--btn)] text-white"
          : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]"
      }`}
    >
      {label}
    </button>
  );
}
