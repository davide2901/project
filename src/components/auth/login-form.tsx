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
  variant?: "app" | "marketing";
};

export function LoginForm({ next = "/home", variant = "app" }: LoginFormProps) {
  const [state, action, pending] = useActionState(signInWithPassword, initial);
  const errorClass =
    variant === "marketing"
      ? "auth-alert-error rounded-md px-3 py-2 text-sm"
      : "rounded-md bg-red-50 px-3 py-2 text-sm text-red-700";
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

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
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
            autoComplete="current-password"
            required
            className="field"
            placeholder="••••••••"
          />
        </div>
        {state.error ? (
          <p className={errorClass} role="alert">
            {state.error}
          </p>
        ) : null}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Accesso..." : "Accedi"}
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
        <input type="hidden" name="next" value={next} />
        <button type="submit" className="btn-secondary w-full">
          Continua con Google
        </button>
      </form>
    </div>
  );
}
