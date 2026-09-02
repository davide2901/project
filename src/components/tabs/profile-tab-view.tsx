"use client";

import { Suspense } from "react";

import {
  buildOnboardingSteps,
  OnboardingProgress,
} from "@/components/onboarding/onboarding-progress";
import { TabLink } from "@/components/layout/tab-link";
import { ProfileForm } from "@/components/profile/profile-form";
import type { TabsBootstrap } from "@/lib/tabs/bootstrap";

export function ProfileTabView({ data }: { data: TabsBootstrap["profilo"] }) {
  if (data.error) {
    return (
      <div className="space-y-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">CV</h1>
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Impossibile caricare il profilo. Riprova più tardi.
        </p>
      </div>
    );
  }

  if (!data.profile) {
    return (
      <div className="space-y-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">CV</h1>
        <p className="text-sm text-[var(--muted)]">
          Nessun profilo trovato. Contatta il supporto o riprova più tardi.
        </p>
      </div>
    );
  }

  const profileReady = Boolean(
    data.profile.skills.length > 0 || data.profile.cv_fallback_text?.trim(),
  );

  const steps = buildOnboardingSteps({
    profileReady,
    hasOffers: false,
    hasApplications: false,
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-[1.85rem] tracking-tight text-[var(--ink)] sm:text-3xl">
          Il tuo CV
        </h1>
        <p className="max-w-prose text-sm text-[var(--muted)]">
          {profileReady ? (
            <>
              Competenze, testo CV e preferenze. Quando sei pronto, torna in{" "}
              <TabLink tab="home" className="text-link">
                Home
              </TabLink>{" "}
              per cercare offerte.
            </>
          ) : (
            <>
              Qui metti il CV e le competenze che possiedi già. È il primo passo
              per ricevere proposte utili.
            </>
          )}
        </p>
      </header>

      {!profileReady ? (
        <OnboardingProgress steps={steps} compact />
      ) : null}

      <Suspense fallback={null}>
        <ProfileForm
          profile={data.profile}
          figmaOAuthConfigured={data.figmaOAuthConfigured}
          figmaStatus={data.figmaStatus}
          showOnboardingHint={!profileReady}
        />
      </Suspense>
    </div>
  );
}
