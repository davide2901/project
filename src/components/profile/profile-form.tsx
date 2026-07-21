"use client";

import { useActionState, useEffect } from "react";

import {
  updateProfile,
  type ProfileActionState,
} from "@/app/actions/profile";
import type { JobPreference, Profile } from "@/lib/types/database";

const initial: ProfileActionState = { error: null, success: false };

const PREFERENCES: { value: JobPreference; label: string; hint: string }[] = [
  {
    value: "lavoro",
    label: "Lavoro",
    hint: "Posizioni full/part-time, no stage",
  },
  {
    value: "stage",
    label: "Stage / Tirocinio",
    hint: "Stage, tirocinio, internship",
  },
  {
    value: "entrambi",
    label: "Entrambi",
    hint: "Lavoro e stage/tirocini",
  },
];

type ProfileFormProps = {
  profile: Profile;
};

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, initial);

  useEffect(() => {
    if (state.success) {
      const t = window.setTimeout(() => undefined, 0);
      return () => window.clearTimeout(t);
    }
  }, [state.success]);

  return (
    <form action={action} className="space-y-8">
      <section className="space-y-4">
        <header>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Anagrafica
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Dati base e link ai file Figma (sola lettura in Fase 1).
          </p>
        </header>
        <div className="space-y-1.5">
          <label htmlFor="full_name" className="text-sm font-medium">
            Nome completo
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            defaultValue={profile.full_name ?? ""}
            className="field"
            placeholder="Mario Rossi"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="figma_cv_url" className="text-sm font-medium">
              Link Figma CV
            </label>
            <input
              id="figma_cv_url"
              name="figma_cv_url"
              type="url"
              defaultValue={profile.figma_cv_url ?? ""}
              className="field"
              placeholder="https://www.figma.com/design/..."
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="figma_portfolio_url" className="text-sm font-medium">
              Link Figma Portfolio
            </label>
            <input
              id="figma_portfolio_url"
              name="figma_portfolio_url"
              type="url"
              defaultValue={profile.figma_portfolio_url ?? ""}
              className="field"
              placeholder="https://www.figma.com/design/..."
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Preferenza posizioni
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Include esplicitamente stage, tirocinio e internship quando
            selezionati.
          </p>
        </header>
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="sr-only">Preferenza lavoro o stage</legend>
          {PREFERENCES.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer flex-col gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-3 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--tint)]"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  name="job_preference"
                  value={opt.value}
                  defaultChecked={profile.job_preference === opt.value}
                  className="accent-[var(--accent)]"
                />
                {opt.label}
              </span>
              <span className="pl-6 text-xs text-[var(--muted)]">{opt.hint}</span>
            </label>
          ))}
        </fieldset>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Competenze
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Solo competenze già possedute. L&apos;AI non ne inventerà di nuove.
          </p>
        </header>
        <div className="space-y-1.5">
          <label htmlFor="skills" className="text-sm font-medium">
            Elenco (una per riga o separate da virgola)
          </label>
          <textarea
            id="skills"
            name="skills"
            rows={4}
            defaultValue={profile.skills.join("\n")}
            className="field resize-y"
            placeholder={"React\nTypeScript\nFigma"}
          />
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            CV testuale (fallback)
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Usato in Fase 1 per l&apos;ottimizzazione testuale, finché Figma non
            è collegato.
          </p>
        </header>
        <textarea
          id="cv_fallback_text"
          name="cv_fallback_text"
          rows={10}
          defaultValue={profile.cv_fallback_text ?? ""}
          className="field resize-y font-[family-name:var(--font-mono)] text-sm"
          placeholder="Incolla qui il testo del tuo CV..."
        />
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Aziende di interesse
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Base per la Discovery (Fase 4). Una per riga.
          </p>
        </header>
        <textarea
          id="companies_of_interest"
          name="companies_of_interest"
          rows={4}
          defaultValue={profile.companies_of_interest.join("\n")}
          className="field resize-y"
          placeholder={"Acme Spa\nBeta Studio"}
        />
      </section>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          Profilo salvato.
        </p>
      ) : null}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Salvataggio..." : "Salva profilo"}
      </button>
    </form>
  );
}
