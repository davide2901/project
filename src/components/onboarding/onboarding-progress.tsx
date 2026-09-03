"use client";

import { TabLink } from "@/components/layout/tab-link";

export type OnboardingStep = {
  id: "profile" | "search" | "documents";
  label: string;
  done: boolean;
  current?: boolean;
};

type Props = {
  steps: OnboardingStep[];
  compact?: boolean;
};

export function OnboardingProgress({ steps, compact = false }: Props) {
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (allDone && compact) return null;

  if (compact) {
    const next = steps.find((s) => !s.done);
    return (
      <section
        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3"
        aria-label="Prossimo passo"
      >
        <p className="text-sm text-[var(--muted)]">
          Prossimo:{" "}
          <span className="font-semibold text-[var(--ink)]">
            {next?.label ?? "Tutto pronto"}
          </span>
        </p>
        {!steps[0]?.done ? (
          <TabLink
            tab="profilo"
            className="btn-primary mt-3 inline-flex w-full justify-center"
          >
            Completa il CV
          </TabLink>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow)] ${
        compact ? "" : ""
      }`}
      aria-label="I tuoi passi"
    >
      {!compact ? (
        <div className="mb-3 space-y-1">
          <p className="font-semibold text-[var(--ink)]">Come funziona</p>
          <p className="text-sm text-[var(--muted)]">
            {doneCount}/{steps.length} passi completati
          </p>
        </div>
      ) : (
        <p className="mb-3 text-sm text-[var(--muted)]">
          Prossimo passo:{" "}
          <span className="font-semibold text-[var(--ink)]">
            {steps.find((s) => !s.done)?.label ?? "Tutto pronto"}
          </span>
        </p>
      )}

      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={step.id} className="flex items-start gap-3 text-sm">
            <span
              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                step.done
                  ? "bg-[var(--btn)] text-white"
                  : step.current
                    ? "border-2 border-[var(--btn)] text-[var(--ink)]"
                    : "border border-[var(--line)] text-[var(--muted)]"
              }`}
              aria-hidden
            >
              {step.done ? "✓" : i + 1}
            </span>
            <span
              className={
                step.done
                  ? "text-[var(--muted)] line-through"
                  : "font-medium text-[var(--ink)]"
              }
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>

      {!steps[0]?.done ? (
        <TabLink tab="profilo" className="btn-primary mt-4 inline-flex w-full justify-center">
          Completa il CV
        </TabLink>
      ) : null}
    </section>
  );
}

export function buildOnboardingSteps(input: {
  profileReady: boolean;
  hasOffers: boolean;
  hasApplications: boolean;
}): OnboardingStep[] {
  const { profileReady, hasOffers, hasApplications } = input;
  return [
    {
      id: "profile",
      label: "Completa il CV (testo o competenze)",
      done: profileReady,
      current: !profileReady,
    },
    {
      id: "search",
      label: "Cerca offerte sulla Home",
      done: hasOffers || hasApplications,
      current: profileReady && !hasOffers && !hasApplications,
    },
    {
      id: "documents",
      label: "Genera CV e documenti in Archivio",
      done: hasApplications,
      current: profileReady && (hasOffers || hasApplications) && !hasApplications,
    },
  ];
}
