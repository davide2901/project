"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { loadFacsimilesIntoAccount } from "@/app/actions/fixtures";

export function LoadFacsimilesButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="btn-primary"
        disabled={pending}
        onClick={() => {
          setError(null);
          setMessage(null);
          startTransition(async () => {
            const res = await loadFacsimilesIntoAccount();
            if (!res.ok) {
              setError(res.error);
              return;
            }
            setMessage(
              `Profilo aggiornato · ${res.inserted} candidature inserite in Archivio.`,
            );
            router.refresh();
          });
        }}
      >
        {pending ? "Caricamento..." : "Carica facsimile di test"}
      </button>
      {message ? (
        <p className="text-sm text-[var(--accent)]" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
