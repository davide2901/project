"use client";

import {
  buildOnboardingSteps,
  OnboardingProgress,
} from "@/components/onboarding/onboarding-progress";
import { DiscoveryPanel } from "@/components/discovery/discovery-panel";
import { ExternalAppLink, TabLink } from "@/components/layout/tab-link";
import type { TabsBootstrap } from "@/lib/tabs/bootstrap";

export function HomeTabView({ data }: { data: TabsBootstrap["home"] }) {
  const needsProfile = !data.profileReady;
  const steps = buildOnboardingSteps({
    profileReady: data.profileReady,
    hasOffers: data.offers.length > 0,
    hasApplications: (data.count ?? 0) > 0,
  });
  const showGuide = !steps.every((s) => s.done);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-[1.85rem] tracking-tight text-[var(--ink)] sm:text-3xl">
          {data.firstName ? `Ciao, ${data.firstName}` : "Ciao"}
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-[var(--muted)]">
          {needsProfile
            ? "Inizia dal profilo: senza CV o competenze non possiamo proporti offerte utili."
            : "Cerca offerte, genera il CV europeo e salvalo in archivio."}
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

      {showGuide ? <OnboardingProgress steps={steps} /> : null}

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
