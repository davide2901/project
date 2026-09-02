"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  parseCvUpload,
  type ParseCvState,
} from "@/app/actions/cv-upload";
import type { CvExtract } from "@/lib/ai/cv-extract-schema";

const initial: ParseCvState = { error: null, extract: null };

type CvUploadProps = {
  onExtracted: (extract: CvExtract) => void;
  /** Se il profilo ha già un CV: UI più compatta, non sembra “incompleto”. */
  hasExistingCv?: boolean;
};

export function CvUpload({ onExtracted, hasExistingCv = false }: CvUploadProps) {
  const [state, action, pending] = useActionState(parseCvUpload, initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastExtract = useRef<CvExtract | null>(null);

  useEffect(() => {
    if (state.extract && state.extract !== lastExtract.current) {
      lastExtract.current = state.extract;
      onExtracted(state.extract);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [state.extract, onExtracted]);

  if (hasExistingCv) {
    return (
      <details className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow)]">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--ink)]">
          Aggiorna CV da file (opzionale)
        </summary>
        <div className="mt-3 space-y-3 border-t border-[var(--line)] pt-3">
          <p className="text-sm text-[var(--muted)]">
            Hai già un CV nel profilo. Carica un nuovo file solo se vuoi
            sostituirlo: rivedi i campi e premi Salva profilo.
          </p>
          <UploadForm
            action={action}
            pending={pending}
            inputRef={inputRef}
            state={state}
          />
        </div>
      </details>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="space-y-1">
        <p className="label-caps">Carica CV</p>
        <p className="text-sm text-[var(--muted)]">
          PDF, DOCX o foto: lo analizziamo e precompiliamo i campi sotto.
          Controlla sempre e premi Salva profilo.
        </p>
      </div>
      <UploadForm
        action={action}
        pending={pending}
        inputRef={inputRef}
        state={state}
      />
    </section>
  );
}

function UploadForm({
  action,
  pending,
  inputRef,
  state,
}: {
  action: (payload: FormData) => void;
  pending: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  state: ParseCvState;
}) {
  return (
    <>
      <form action={action} className="space-y-3">
        <input
          ref={inputRef}
          id="cv_file"
          name="cv_file"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
          className="block w-full text-sm text-[var(--ink)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--btn)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          required
        />
        <button
          type="submit"
          className="btn-primary w-full sm:w-auto"
          disabled={pending}
        >
          {pending ? "Analisi in corso..." : "Analizza e precompila"}
        </button>
      </form>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.extract && !state.error ? (
        <p
          className="rounded-md bg-[var(--tint)] px-3 py-2 text-sm text-[var(--ink)]"
          role="status"
        >
          CV analizzato: campi aggiornati qui sotto. Rivedi e premi Salva
          profilo.
          {state.extract.notes ? ` (${state.extract.notes})` : null}
        </p>
      ) : null}
    </>
  );
}
