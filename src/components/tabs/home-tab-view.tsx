"use client";

import { SoftDaylightSpot } from "@/components/brand/soft-daylight-spot";
import { DiscoveryPanel } from "@/components/discovery/discovery-panel";
import { ExternalAppLink, TabLink } from "@/components/layout/tab-link";
import type { TabsBootstrap } from "@/lib/tabs/bootstrap";

export function HomeTabView({ data }: { data: TabsBootstrap["home"] }) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-[1.85rem] tracking-tight text-[var(--ink)] sm:text-3xl">
          {data.firstName ? `Ciao, ${data.firstName}` : "Ciao"}
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-[var(--muted)]">
          Passi chiari, direzione su misura.
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

      <ExternalAppLink
        href="/candidatura/nuova"
        className="btn-primary btn-stack-mobile"
      >
        Nuova candidatura
        <span aria-hidden>→</span>
      </ExternalAppLink>

      {!data.profileReady && data.offers.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-8 text-center shadow-[var(--shadow)]">
          <SoftDaylightSpot title="Completa il profilo per ricevere proposte allineate a te." />
          <TabLink tab="profilo" className="btn-secondary mt-5 inline-flex">
            Vai al profilo
          </TabLink>
        </div>
      ) : null}

      <DiscoveryPanel offers={data.offers} profileReady={data.profileReady} />
    </div>
  );
}
