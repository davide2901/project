"use client";

import { useActionState } from "react";

import {
  signInWithGoogle,
  signInWithPassword,
  type AuthActionState,
} from "@/app/actions/auth";

const initial: AuthActionState = { error: null };

type LoginFormProps = {
  next?: string;
};

export function LoginForm({ next = "/profilo" }: LoginFormProps) {
  const [state, action, pending] = useActionState(signInWithPassword, initial);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
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
          <label
            htmlFor="password"
            className="text-sm font-medium text-[var(--ink)]"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="field"
            placeholder="••••••••"
          />
        </div>
        {state.error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {state.error}
          </p>
        ) : null}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Accesso..." : "Accedi"}
        </button>
      </form>

      <div className="relative text-center text-xs uppercase tracking-wider text-[var(--muted)]">
        <span className="relative z-10 bg-[var(--surface)] px-3">oppure</span>
        <span className="absolute inset-x-0 top-1/2 h-px bg-[var(--line)]" />
      </div>

      <form action={signInWithGoogle.bind(null, next)}>
        <button type="submit" className="btn-secondary w-full">
          Continua con Google
        </button>
      </form>
    </div>
  );
}
