"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  signInWithGoogle,
  signUpWithPassword,
  type AuthActionState,
} from "@/app/actions/auth";

const initial: AuthActionState = { error: null };

type RegisterFormProps = {
  variant?: "app" | "marketing";
};

export function RegisterForm({ variant = "app" }: RegisterFormProps) {
  const [state, action, pending] = useActionState(signUpWithPassword, initial);
  const errorClass =
    variant === "marketing"
      ? "auth-alert-error rounded-md px-3 py-2 text-sm"
      : "rounded-md bg-red-50 px-3 py-2 text-sm text-red-700";
  const infoClass =
    variant === "marketing"
      ? "auth-alert-info rounded-lg px-4 py-5 text-sm"
      : "rounded-lg border border-[var(--line)] bg-[var(--tint)] px-4 py-5 text-sm text-[var(--ink)]";
  const orLabelClass =
    variant === "marketing"
      ? "auth-or-label relative z-10 px-3"
      : "relative z-10 bg-[var(--background)] px-3";
  const orLineClass =
    variant === "marketing"
      ? "auth-or-line absolute inset-x-0 top-1/2 h-px"
      : "absolute inset-x-0 top-1/2 h-px bg-[var(--line)]";
  const labelClass =
    variant === "marketing"
      ? "text-sm font-medium"
      : "text-sm font-medium text-[var(--ink)]";
  const mutedClass =
    variant === "marketing" ? "text-[var(--sand-muted)]" : "text-[var(--muted)]";

  if (state.needsEmailConfirm) {
    return (
      <div className="space-y-6">
        <div className={infoClass}>
          <p className="font-medium">Controlla la tua email</p>
          <p className={`mt-1 ${mutedClass}`}>
            Ti abbiamo inviato un link di conferma. Dopo la verifica potrai
            accedere e completare il profilo.
          </p>
        </div>
        <p className={`text-center text-sm ${mutedClass}`}>
          <Link href="/login" className="text-link">
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
          <label htmlFor="full_name" className={labelClass}>
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
          <label htmlFor="email" className={labelClass}>
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
          <label htmlFor="password" className={labelClass}>
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
          <p className={errorClass} role="alert">
            {state.error}
          </p>
        ) : null}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Creazione account..." : "Crea account"}
        </button>
      </form>

      <div
        className={`relative text-center text-xs uppercase tracking-wider ${
          variant === "marketing" ? "text-[var(--sand-muted)]" : "text-[var(--muted)]"
        }`}
      >
        <span className={orLabelClass}>oppure</span>
        <span className={orLineClass} />
      </div>

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value="/home" />
        <button type="submit" className="btn-secondary w-full">
          Continua con Google
        </button>
      </form>

      <p className={`text-center text-sm ${mutedClass}`}>
        Hai già un account?{" "}
        <Link href="/login" className="text-link">
          Accedi
        </Link>
      </p>
    </div>
  );
}
