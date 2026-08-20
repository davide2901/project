"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  disconnectFigma,
  importCvFromFigma,
} from "@/app/actions/figma";
import type { CvExtract } from "@/lib/ai/cv-extract-schema";
import type { FigmaConnectionStatus } from "@/lib/types/database";

type Props = {
  oauthConfigured: boolean;
  status: FigmaConnectionStatus;
  hasFigmaCvUrl: boolean;
  onExtracted: (extract: CvExtract) => void;
};

const FIGMA_FLASH: Record<string, string> = {
  connected: "Account Figma collegato.",
  denied: "Autorizzazione Figma annullata.",
  missing_oauth_app:
    "OAuth Figma non configurato sul server (FIGMA_CLIENT_ID / SECRET).",
  invalid_callback: "Callback Figma non valido.",
  state_mismatch: "Sessione OAuth scaduta. Riprova a collegare Figma.",
  error: "Errore durante il collegamento Figma.",
};

export function FigmaConnectPanel({
  oauthConfigured,
  status,
  hasFigmaCvUrl,
  onExtracted,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const flag = searchParams.get("figma");
    if (!flag) return;
    const detail = searchParams.get("detail");
    if (flag === "error") {
      setError(detail || FIGMA_FLASH.error);
    } else if (FIGMA_FLASH[flag]) {
      setMessage(FIGMA_FLASH[flag]);
    }
    router.replace("/profilo", { scroll: false });
  }, [searchParams, router]);

  function onDisconnect() {
    setError(null);
    startTransition(async () => {
      const res = await disconnectFigma();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage("Account Figma scollegato.");
      router.refresh();
    });
  }

  function onImport() {
    setError(null);
    startTransition(async () => {
      const res = await importCvFromFigma();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onExtracted(res.extract);
      setMessage(
        `CV importato da Figma («${res.fileName}»). Rivedi i campi e salva il profilo.`,
      );
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
      <div className="space-y-1">
        <p className="label-caps">Figma</p>
        <p className="text-sm text-[var(--muted)]">
          Collega il <strong>tuo</strong> account per importare il CV dal file
          Figma. L&apos;export dopo la generazione usa il plugin SuMisura +
          codice sync (l&apos;API Figma non scrive text node).
        </p>
      </div>

      {!oauthConfigured ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          OAuth non attivo: aggiungi FIGMA_CLIENT_ID e FIGMA_CLIENT_SECRET
          (Vercel / .env.local), poi crea l&apos;app su{" "}
          <a
            className="underline"
            href="https://www.figma.com/developers/apps"
            target="_blank"
            rel="noreferrer"
          >
            figma.com/developers/apps
          </a>
          .
        </p>
      ) : status.connected ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--ink)]">
            Collegato
            {status.figma_handle ? (
              <>
                {" "}
                come <span className="font-medium">@{status.figma_handle}</span>
              </>
            ) : null}
            {status.figma_email ? (
              <span className="text-[var(--muted)]"> · {status.figma_email}</span>
            ) : null}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="btn-primary"
              disabled={pending || !hasFigmaCvUrl}
              onClick={onImport}
            >
              {pending ? "Import in corso..." : "Importa CV da Figma"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={onDisconnect}
            >
              Scollega
            </button>
          </div>
          {!hasFigmaCvUrl ? (
            <p className="text-xs text-[var(--muted)]">
              Salva prima un Link Figma CV qui sotto, poi importa.
            </p>
          ) : null}
        </div>
      ) : (
        <a href="/api/figma/connect" className="btn-primary inline-flex">
          Collega Figma
        </a>
      )}

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="rounded-md bg-[var(--tint)] px-3 py-2 text-sm text-[var(--ink)]"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
