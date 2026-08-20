"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";

import {
  updateProfile,
  type ProfileActionState,
} from "@/app/actions/profile";
import { CvUpload } from "@/components/profile/cv-upload";
import { FigmaConnectPanel } from "@/components/profile/figma-connect-panel";
import type { CvExtract } from "@/lib/ai/cv-extract-schema";
import type {
  FigmaConnectionStatus,
  JobPreference,
  Profile,
} from "@/lib/types/database";

const initial: ProfileActionState = { error: null, success: false };

const PREFERENCES: { value: JobPreference; label: string }[] = [
  { value: "lavoro", label: "Lavoro" },
  { value: "stage", label: "Stage" },
  { value: "entrambi", label: "Entrambi" },
];

type ProfileFormProps = {
  profile: Profile;
  figmaOAuthConfigured: boolean;
  figmaStatus: FigmaConnectionStatus;
};

type FormValues = {
  full_name: string;
  job_preference: JobPreference;
  skills: string;
  cv_fallback_text: string;
  companies_of_interest: string;
  figma_cv_url: string;
  figma_portfolio_url: string;
};

function fromProfile(profile: Profile): FormValues {
  return {
    full_name: profile.full_name ?? "",
    job_preference: profile.job_preference,
    skills: profile.skills.join(", "),
    cv_fallback_text: profile.cv_fallback_text ?? "",
    companies_of_interest: profile.companies_of_interest.join("\n"),
    figma_cv_url: profile.figma_cv_url ?? "",
    figma_portfolio_url: profile.figma_portfolio_url ?? "",
  };
}

function sameValues(a: FormValues, b: FormValues): boolean {
  return (
    a.full_name === b.full_name &&
    a.job_preference === b.job_preference &&
    a.skills === b.skills &&
    a.cv_fallback_text === b.cv_fallback_text &&
    a.companies_of_interest === b.companies_of_interest &&
    a.figma_cv_url === b.figma_cv_url &&
    a.figma_portfolio_url === b.figma_portfolio_url
  );
}

export function ProfileForm({
  profile,
  figmaOAuthConfigured,
  figmaStatus,
}: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, initial);
  const [values, setValues] = useState<FormValues>(() => fromProfile(profile));
  const [saved, setSaved] = useState<FormValues>(() => fromProfile(profile));
  const lastSuccess = useRef(false);

  const dirty = !sameValues(values, saved);

  useEffect(() => {
    if (state.success && !lastSuccess.current) {
      setSaved(values);
    }
    lastSuccess.current = state.success;
  }, [state.success, values]);

  const onExtracted = useCallback((extract: CvExtract) => {
    setValues((prev) => ({
      ...prev,
      full_name: extract.full_name?.trim() || prev.full_name,
      skills:
        extract.skills.length > 0 ? extract.skills.join(", ") : prev.skills,
      cv_fallback_text: extract.cv_fallback_text || prev.cv_fallback_text,
      companies_of_interest:
        extract.companies_of_interest.length > 0
          ? extract.companies_of_interest.join("\n")
          : prev.companies_of_interest,
      job_preference: extract.job_preference ?? prev.job_preference,
    }));
  }, []);

  const skillChips = values.skills
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="space-y-8">
      <CvUpload onExtracted={onExtracted} />

      <FigmaConnectPanel
        oauthConfigured={figmaOAuthConfigured}
        status={figmaStatus}
        hasFigmaCvUrl={Boolean(values.figma_cv_url.trim())}
        onExtracted={onExtracted}
      />

      <form action={action} className="space-y-8">
        <section className="space-y-3">
          <label htmlFor="full_name" className="label-caps">
            Nome completo
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            value={values.full_name}
            onChange={(e) =>
              setValues((v) => ({ ...v, full_name: e.target.value }))
            }
            className="field"
            placeholder="Mario Rossi"
          />
        </section>

        <section className="space-y-3">
          <p className="label-caps">Preferenza</p>
          <fieldset className="flex rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1">
            <legend className="sr-only">Preferenza lavoro o stage</legend>
            {PREFERENCES.map((opt) => (
              <label
                key={opt.value}
                className="flex min-h-[2.75rem] flex-1 cursor-pointer items-center justify-center rounded-lg px-2 py-2.5 text-center text-sm font-semibold text-[var(--ink)] transition has-[:checked]:bg-[var(--btn)] has-[:checked]:text-white"
              >
                <input
                  type="radio"
                  name="job_preference"
                  value={opt.value}
                  checked={values.job_preference === opt.value}
                  onChange={() =>
                    setValues((v) => ({ ...v, job_preference: opt.value }))
                  }
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </fieldset>
        </section>

        <section className="space-y-3">
          <label htmlFor="skills" className="label-caps">
            Competenze
          </label>
          {skillChips.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-hidden>
              {skillChips.map((skill) => (
                <li
                  key={skill}
                  className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--ink)]"
                >
                  {skill}
                </li>
              ))}
            </ul>
          ) : null}
          <textarea
            id="skills"
            name="skills"
            rows={3}
            value={values.skills}
            onChange={(e) =>
              setValues((v) => ({ ...v, skills: e.target.value }))
            }
            className="field resize-y"
            placeholder="React, TypeScript, Figma"
          />
          <p className="text-xs text-[var(--muted)]">
            Separate da virgola. Solo competenze già possedute.
          </p>
        </section>

        <section className="space-y-3">
          <label htmlFor="cv_fallback_text" className="label-caps">
            CV
          </label>
          <textarea
            id="cv_fallback_text"
            name="cv_fallback_text"
            rows={8}
            value={values.cv_fallback_text}
            onChange={(e) =>
              setValues((v) => ({ ...v, cv_fallback_text: e.target.value }))
            }
            className="field resize-y"
            placeholder="Incolla qui il tuo CV oppure caricalo sopra..."
          />
        </section>

        <section className="space-y-3">
          <label htmlFor="companies_of_interest" className="label-caps">
            Aziende di interesse
          </label>
          <textarea
            id="companies_of_interest"
            name="companies_of_interest"
            rows={3}
            value={values.companies_of_interest}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                companies_of_interest: e.target.value,
              }))
            }
            className="field resize-y"
            placeholder={"Acme Spa\nBeta Studio"}
          />
        </section>

        <section className="space-y-3">
          <div className="space-y-1">
            <p className="label-caps">Link Figma (tuoi file)</p>
            <p className="text-sm text-[var(--muted)]">
              Ogni utente usa i propri file. Dopo la generazione, «Apri in Figma»
              copia CV e lettera e apre questi link — nessuna sincronizzazione
              automatica con un account condiviso.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <label htmlFor="figma_cv_url" className="label-caps">
                Link Figma CV
              </label>
              <input
                id="figma_cv_url"
                name="figma_cv_url"
                type="url"
                value={values.figma_cv_url}
                onChange={(e) =>
                  setValues((v) => ({ ...v, figma_cv_url: e.target.value }))
                }
                className="field"
                placeholder="https://www.figma.com/..."
              />
            </div>
            <div className="space-y-3">
              <label htmlFor="figma_portfolio_url" className="label-caps">
                Link Figma Portfolio
              </label>
              <input
                id="figma_portfolio_url"
                name="figma_portfolio_url"
                type="url"
                value={values.figma_portfolio_url}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    figma_portfolio_url: e.target.value,
                  }))
                }
                className="field"
                placeholder="https://www.figma.com/..."
              />
            </div>
          </div>
        </section>

        {state.error ? (
          <p
            className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}
        {state.success && !dirty ? (
          <p
            className="rounded-md bg-[var(--tint)] px-3 py-2 text-sm text-[var(--ink)]"
            role="status"
          >
            Profilo salvato.
          </p>
        ) : null}

        {dirty ? (
          <>
            <div className="sticky-action-bar-spacer" aria-hidden />
            <div className="sticky-action-bar">
              <div className="mx-auto w-full max-w-3xl">
                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={pending}
                >
                  {pending ? "Salvataggio..." : "Salva profilo"}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </form>
    </div>
  );
}
