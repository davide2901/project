"use client";

import Link from "next/link";

import type { TabsBootstrap } from "@/lib/tabs/bootstrap";

export function StatsTabView({ data }: { data: TabsBootstrap["statistiche"] }) {
  const hasData = data.total > 0;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-[1.85rem] tracking-tight text-[var(--ink)] sm:text-3xl">
          Statistiche
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Riepilogo delle candidature salvate in archivio.
        </p>
      </header>

      <dl className="grid grid-cols-3 gap-3">
        <StatCard label="Totale" value={String(data.total)} highlight />
        <StatCard label="Lavoro" value={String(data.lavoro)} />
        <StatCard label="Stage" value={String(data.stage)} />
      </dl>

      {hasData ? (
        <section className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow)]">
          <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
            Mix posizioni
          </h2>
          <BarRow
            label="Lavoro"
            count={data.lavoro}
            total={data.total}
          />
          <BarRow label="Stage" count={data.stage} total={data.total} />
          <BarRow
            label="Altro / non chiaro"
            count={Math.max(0, data.total - data.lavoro - data.stage)}
            total={data.total}
          />
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-10 text-center">
          <p className="text-sm text-[var(--muted)]">
            Nessuna candidatura ancora: le stats si aggiornano quando ne salvi
            una.
          </p>
          <Link href="/candidatura/nuova" className="btn-primary mt-5 inline-flex">
            Nuova candidatura
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--line)] px-3 py-4 sm:px-4 sm:py-5 ${
        highlight
          ? "bg-[var(--btn)] text-white"
          : "bg-[var(--surface)] shadow-[var(--shadow)]"
      }`}
    >
      <dt
        className={`text-[0.65rem] font-semibold uppercase tracking-[0.12em] sm:text-xs ${
          highlight ? "text-white/70" : "text-[var(--muted)]"
        }`}
      >
        {label}
      </dt>
      <dd
        className={`mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-3xl ${
          highlight ? "text-white" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function BarRow({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-[var(--ink)]">{label}</span>
        <span className="text-[var(--muted)]">
          {count} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--tint)]">
        <div
          className="h-full rounded-full bg-[var(--accent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
