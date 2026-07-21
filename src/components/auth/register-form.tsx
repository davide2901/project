"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  signInWithGoogle,
  signUpWithPassword,
  type AuthActionState,
} from "@/app/actions/auth";

const initial: AuthActionState = { error: null };

export function RegisterForm() {
  const [state, action, pending] = useActionState(signUpWithPassword, initial);

  if (state.needsEmailConfirm) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--tint)] px-4 py-5 text-sm text-[var(--ink)]">
          <p className="font-medium">Controlla la tua email</p>
          <p className="mt-1 text-[var(--muted)]">
            Ti abbiamo inviato un link di conferma. Dopo la verifica potrai
            accedere e completare il profilo.
          </p>
        </div>
        <p className="text-center text-sm text-[var(--muted)]">
          <Link
            href="/login"
            className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Torna al login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="full_name" className="text-sm font-medium text-[var(--ink)]">
            Nome
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            className="field"
            placeholder="Mario Rossi"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-[var(--ink)]">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="field"
            placeholder="tu@email.com"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-[var(--ink)]">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="field"
            placeholder="Minimo 8 caratteri"
          />
        </div>
        {state.error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {state.error}
          </p>
        ) : null}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Creazione account..." : "Crea account"}
        </button>
      </form>

      <div className="relative text-center text-xs uppercase tracking-wider text-[var(--muted)]">
        <span className="relative z-10 bg-[var(--surface)] px-3">oppure</span>
        <span className="absolute inset-x-0 top-1/2 h-px bg-[var(--line)]" />
      </div>

      <form action={signInWithGoogle.bind(null, "/profilo")}>
        <button type="submit" className="btn-secondary w-full">
          Continua con Google
        </button>
      </form>

      <p className="text-center text-sm text-[var(--muted)]">
        Hai già un account?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        >
          Accedi
        </Link>
      </p>
    </div>
  );
}
