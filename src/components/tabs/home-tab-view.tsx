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
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)]">
          {data.firstName ? `Ciao, ${data.firstName}` : "Ciao"}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {needsProfile
            ? "Completa il CV per ricevere offerte."
            : "Cerca, genera, archivia."}
          {typeof data.count === "number" && data.count > 0 ? (
            <>
              {" "}
              <TabLink tab="archivio" className="text-link">
                {data.count} in archivio
              </TabLink>
            </>
          ) : null}
        </p>
      </header>

      {showGuide ? <OnboardingProgress steps={steps} compact /> : null}

      {!needsProfile ? (
        <DiscoveryPanel
          offers={data.offers}
          profileReady={data.profileReady}
          skills={data.skills}
          companiesOfInterest={data.companiesOfInterest}
          preferredLocations={data.preferredLocations}
        />
      ) : null}

      {!needsProfile ? (
        <div className="border-t border-[var(--line)] pt-4">
          <ExternalAppLink
            href="/candidatura/nuova"
            className="btn-secondary btn-stack-mobile"
          >
            Ho già un’offerta
            <span aria-hidden>→</span>
          </ExternalAppLink>
        </div>
      ) : null}
    </div>
  );
}
