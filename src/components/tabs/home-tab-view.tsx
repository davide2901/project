"use client";

import { SoftDaylightSpot } from "@/components/brand/soft-daylight-spot";
import { DiscoveryPanel } from "@/components/discovery/discovery-panel";
import { ExternalAppLink, TabLink } from "@/components/layout/tab-link";
import type { TabsBootstrap } from "@/lib/tabs/bootstrap";

export function HomeTabView({ data }: { data: TabsBootstrap["home"] }) {
  const needsProfile = !data.profileReady;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-[1.85rem] tracking-tight text-[var(--ink)] sm:text-3xl">
          {data.firstName ? `Ciao, ${data.firstName}` : "Ciao"}
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-[var(--muted)]">
          Tre passi: completa il profilo, trova offerte, genera i documenti.
          {typeof data.count === "number" && data.count > 0 ? (
            <>
              {" "}
              <TabLink tab="archivio" className="text-link">
                {data.count} candidatur{data.count === 1 ? "a" : "e"} in archivio
              </TabLink>
              .
            </>
          ) : null}
        </p>
      </header>

      {needsProfile ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-8 text-center shadow-[var(--shadow)]">
          <SoftDaylightSpot title="Inizia dal profilo: CV o competenze, così possiamo proporti offerte adatte." />
          <TabLink tab="profilo" className="btn-primary mt-5 inline-flex">
            Completa il profilo
          </TabLink>
        </div>
      ) : (
        <ol className="grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)] shadow-[var(--shadow)]">
          <li>
            <span className="font-semibold text-[var(--ink)]">1.</span> Profilo
            pronto
          </li>
          <li>
            <span className="font-semibold text-[var(--ink)]">2.</span> Cerca
            offerte qui sotto
          </li>
          <li>
            <span className="font-semibold text-[var(--ink)]">3.</span> Genera CV
            e lettera
          </li>
        </ol>
      )}

      {!needsProfile ? (
        <DiscoveryPanel offers={data.offers} profileReady={data.profileReady} />
      ) : null}

      {!needsProfile ? (
        <div className="border-t border-[var(--line)] pt-6">
          <p className="mb-3 text-sm text-[var(--muted)]">
            Hai già un&apos;offerta? Incollala e genera la candidatura.
          </p>
          <ExternalAppLink
            href="/candidatura/nuova"
            className="btn-secondary btn-stack-mobile"
          >
            Nuova candidatura manuale
            <span aria-hidden>→</span>
          </ExternalAppLink>
        </div>
      ) : null}
    </div>
  );
}
