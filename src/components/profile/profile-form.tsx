"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";

import {
  updateProfile,
  type ProfileActionState,
} from "@/app/actions/profile";
import { CvUpload } from "@/components/profile/cv-upload";
import { FigmaConnectPanel } from "@/components/profile/figma-connect-panel";
import { OverlaySheet } from "@/components/ui/overlay-sheet";
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
  showOnboardingHint?: boolean;
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

function parseSkills(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\n,;]+/)) {
    const s = part.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function ProfileForm({
  profile,
  figmaOAuthConfigured,
  figmaStatus,
  showOnboardingHint = false,
}: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, initial);
  const [values, setValues] = useState<FormValues>(() => fromProfile(profile));
  const [saved, setSaved] = useState<FormValues>(() => fromProfile(profile));
  const [skillDraft, setSkillDraft] = useState("");
  const [cvEditing, setCvEditing] = useState(
    () => !fromProfile(profile).cv_fallback_text.trim(),
  );
  const [cvSheetOpen, setCvSheetOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const lastSuccess = useRef(false);

  const dirty = !sameValues(values, saved);
  const skillChips = parseSkills(values.skills);
  const hasCv = Boolean(values.cv_fallback_text.trim());

  useEffect(() => {
    if (state.success && !lastSuccess.current) {
      setSaved(values);
      setCvEditing(false);
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
    if (extract.cv_fallback_text) setCvEditing(false);
  }, []);

  function addSkill() {
    const next = parseSkills(`${values.skills}, ${skillDraft}`);
    setValues((v) => ({ ...v, skills: next.join(", ") }));
    setSkillDraft("");
  }

  function removeSkill(skill: string) {
    const next = skillChips.filter(
      (s) => s.toLowerCase() !== skill.toLowerCase(),
    );
    setValues((v) => ({ ...v, skills: next.join(", ") }));
  }

  return (
    <div className="space-y-8">
      {showOnboardingHint ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--tint)] px-4 py-4 text-sm leading-relaxed text-[var(--ink)]">
          <p className="font-semibold">Primo passo</p>
          <p className="mt-1 text-[var(--muted)]">
            Carica o incolla il CV e aggiungi le competenze che possiedi già.
            Poi salva e torna in Home per cercare offerte.
          </p>
        </div>
      ) : null}

      <CvUpload
        onExtracted={onExtracted}
        hasExistingCv={Boolean(values.cv_fallback_text.trim())}
      />

      <form action={action} className="space-y-8">
        <input type="hidden" name="skills" value={values.skills} />
        {!cvEditing ? (
          <input
            type="hidden"
            name="cv_fallback_text"
            value={values.cv_fallback_text}
          />
        ) : null}

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
            placeholder="Il tuo nome e cognome"
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
          <p className="label-caps">Competenze</p>
          <p className="text-xs text-[var(--muted)]">
            Solo competenze che possiedi già. Tocca × per rimuovere.
          </p>
          {skillChips.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {skillChips.map((skill) => (
                <li key={skill}>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--ink)] transition active:bg-[var(--tint)]"
                    aria-label={`Rimuovi ${skill}`}
                  >
                    {skill}
                    <span aria-hidden className="text-[var(--muted)]">
                      ×
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Nessuna competenza ancora.
            </p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={skillDraft}
              onChange={(e) => setSkillDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              className="field flex-1"
              placeholder="Scrivi una competenza e premi Aggiungi"
              aria-label="Aggiungi competenza"
            />
            <button
              type="button"
              className="btn-secondary shrink-0 px-4"
              onClick={addSkill}
              disabled={!skillDraft.trim()}
            >
              Aggiungi
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <p className="label-caps">CV</p>
          <p className="text-xs text-[var(--muted)]">
            Caricalo sopra oppure incollalo qui. Serve per adattare il CV
            europeo alle offerte.
          </p>
          {cvEditing || !hasCv ? (
            <textarea
              id="cv_fallback_text"
              name="cv_fallback_text"
              rows={10}
              value={values.cv_fallback_text}
              onChange={(e) =>
                setValues((v) => ({ ...v, cv_fallback_text: e.target.value }))
              }
              className="field resize-y"
              placeholder="Incolla qui il testo del tuo CV…"
            />
          ) : (
            <button
              type="button"
              onClick={() => setCvSheetOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 text-left shadow-[var(--shadow)] transition active:bg-[var(--tint)]"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--ink)]">CV salvato</p>
                <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
                  Tocca per leggere o modificare
                </p>
              </div>
              <span aria-hidden className="text-[var(--muted)]">
                ›
              </span>
            </button>
          )}
          {hasCv && cvEditing ? (
            <button
              type="button"
              className="text-link text-sm"
              onClick={() => setCvEditing(false)}
            >
              Chiudi modifica
            </button>
          ) : null}
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
            placeholder={
              "Una azienda per riga\n(lascia vuoto se nessuna preferenza)"
            }
          />
        </section>

        <section className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-left"
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
          >
            <span>
              <span className="block text-sm font-semibold text-[var(--ink)]">
                Avanzate · Figma
              </span>
              <span className="mt-0.5 block text-xs text-[var(--muted)]">
                Opzionale: collega i tuoi file per copiare il CV
              </span>
            </span>
            <span aria-hidden className="text-[var(--muted)]">
              {advancedOpen ? "▴" : "▾"}
            </span>
          </button>

          {advancedOpen ? (
            <div className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4">
              <FigmaConnectPanel
                oauthConfigured={figmaOAuthConfigured}
                status={figmaStatus}
                hasFigmaCvUrl={Boolean(values.figma_cv_url.trim())}
                onExtracted={onExtracted}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
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
                <div className="space-y-2">
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
            </div>
          ) : (
            <>
              <input
                type="hidden"
                name="figma_cv_url"
                value={values.figma_cv_url}
              />
              <input
                type="hidden"
                name="figma_portfolio_url"
                value={values.figma_portfolio_url}
              />
            </>
          )}
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
            Salvato.
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
                  {pending ? "Salvataggio..." : "Salva"}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </form>

      <OverlaySheet
        open={cvSheetOpen}
        title="Il tuo CV"
        onClose={() => setCvSheetOpen(false)}
        footer={
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => {
              setCvSheetOpen(false);
              setCvEditing(true);
            }}
          >
            Modifica testo
          </button>
        }
      >
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--ink)]">
          {values.cv_fallback_text}
        </div>
      </OverlaySheet>
    </div>
  );
}
