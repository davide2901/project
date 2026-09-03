"use client";

import Link from "next/link";

import {
  APPLICATION_STATUS_OPTIONS,
  labelStatus,
} from "@/lib/application/labels";
import { TabLink } from "@/components/layout/tab-link";
import type { TabsBootstrap } from "@/lib/tabs/bootstrap";

export function StatsTabView({ data }: { data: TabsBootstrap["statistiche"] }) {
  const hasData = data.total > 0;
  const ready = data.byStatus.ready ?? 0;
  const inFlight =
    (data.byStatus.sent ?? 0) +
    (data.byStatus.waiting ?? 0) +
    (data.byStatus.interview ?? 0);
  const closed = data.byStatus.closed ?? 0;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)]">
          Statistiche
        </h1>
      </header>

      {!hasData ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-6 text-center">
          <p className="text-sm text-[var(--muted)]">Nessuna candidatura ancora.</p>
          <TabLink tab="home" className="btn-primary mt-4 inline-flex">
            Home
          </TabLink>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2">
            <StatTile label="Totale" value={data.total} emphasize />
            <StatTile label="Da inviare" value={ready} />
            <StatTile label="In corso" value={inFlight} />
            <StatTile label="Chiuse" value={closed} />
          </dl>
          <p className="text-xs text-[var(--muted)]">
            {data.lavoro} lavoro · {data.stage} stage
          </p>

          <ul className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
            {APPLICATION_STATUS_OPTIONS.map((opt) => {
              const count = data.byStatus[opt.value] ?? 0;
              const pct =
                data.total > 0 ? Math.round((count / data.total) * 100) : 0;
              return (
                <li
                  key={opt.value}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <span className="text-[var(--ink)]">{opt.label}</span>
                  <span className="tabular-nums text-[var(--muted)]">
                    {count}
                    <span className="ml-2 text-xs">{pct}%</span>
                  </span>
                </li>
              );
            })}
          </ul>

          {data.latest ? (
            <Link
              href={`/archivio/${data.latest.id}`}
              className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-left transition active:bg-[var(--tint)]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--muted)]">Ultima</p>
                <p className="font-semibold text-[var(--ink)]">
                  {data.latest.company_name}
                </p>
                <p className="truncate text-sm text-[var(--muted)]">
                  {data.latest.role_title} · {labelStatus(data.latest.status)}
                </p>
              </div>
              <span aria-hidden className="text-[var(--muted)]">
                ›
              </span>
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--line)] px-3 py-3 ${
        emphasize
          ? "bg-[var(--btn)] text-white"
          : "bg-[var(--surface)] shadow-[var(--shadow)]"
      }`}
    >
      <dt
        className={`text-[0.65rem] font-semibold uppercase tracking-[0.1em] ${
          emphasize ? "text-white/70" : "text-[var(--muted)]"
        }`}
      >
        {label}
      </dt>
      <dd
        className={`mt-0.5 font-[family-name:var(--font-display)] text-xl ${
          emphasize ? "text-white" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
