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
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-[1.85rem] tracking-tight text-[var(--ink)] sm:text-3xl">
          Statistiche
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Quante candidature hai e a che punto sono.
        </p>
      </header>

      {!hasData ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-10 text-center">
          <p className="text-sm text-[var(--muted)]">
            Ancora nessuna candidatura. Quando ne generi una, qui vedi i
            progressi.
          </p>
          <TabLink tab="home" className="btn-primary mt-5 inline-flex">
            Vai alla Home
          </TabLink>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Totale" value={data.total} emphasize />
            <StatTile label="Da inviare" value={ready} />
            <StatTile label="In corso" value={inFlight} />
            <StatTile label="Chiuse" value={closed} />
          </dl>

          <section className="space-y-1">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
              Dettaglio stati
            </h2>
            <ul className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
              {APPLICATION_STATUS_OPTIONS.map((opt) => {
                const count = data.byStatus[opt.value] ?? 0;
                const pct =
                  data.total > 0 ? Math.round((count / data.total) * 100) : 0;
                return (
                  <li
                    key={opt.value}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
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
          </section>

          <section className="space-y-1">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
              Tipo posizione
            </h2>
            <ul className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
              <TypeRow label="Lavoro" count={data.lavoro} total={data.total} />
              <TypeRow label="Stage" count={data.stage} total={data.total} />
              <TypeRow
                label="Altro / non chiaro"
                count={Math.max(0, data.total - data.lavoro - data.stage)}
                total={data.total}
              />
            </ul>
          </section>

          {data.latest ? (
            <section className="space-y-2">
              <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
                Ultima candidatura
              </h2>
              <Link
                href={`/archivio/${data.latest.id}`}
                className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 text-left transition active:bg-[var(--tint)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--ink)]">
                    {data.latest.company_name}
                  </p>
                  <p className="truncate text-sm text-[var(--ink)]">
                    {data.latest.role_title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {labelStatus(data.latest.status)}
                  </p>
                </div>
                <span aria-hidden className="text-[var(--muted)]">
                  ›
                </span>
              </Link>
            </section>
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
      className={`rounded-2xl border border-[var(--line)] px-3 py-4 ${
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
        className={`mt-1 font-[family-name:var(--font-display)] text-2xl ${
          emphasize ? "text-white" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function TypeRow({
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
    <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="text-[var(--ink)]">{label}</span>
      <span className="tabular-nums text-[var(--muted)]">
        {count}
        <span className="ml-2 text-xs">{pct}%</span>
      </span>
    </li>
  );
}
