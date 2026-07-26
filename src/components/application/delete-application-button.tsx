"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { softDeleteApplication } from "@/app/actions/application";

export function DeleteApplicationButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="rounded-md border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)] transition hover:border-red-300 hover:bg-red-50 hover:text-red-800"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Spostare questa candidatura nel cestino?")) return;
          setError(null);
          startTransition(async () => {
            const res = await softDeleteApplication(id);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.push("/archivio");
            router.refresh();
          });
        }}
      >
        {pending ? "Eliminazione..." : "Elimina"}
      </button>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
