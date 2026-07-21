import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Accedi · SuMisura",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/profilo";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-up space-y-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8">
        <header className="space-y-2 text-center">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)]"
          >
            SuMisura
          </Link>
          <p className="text-sm text-[var(--muted)]">
            Accedi al tuo spazio personale. I dati restano isolati per account.
          </p>
        </header>
        {params.error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            Autenticazione non riuscita. Riprova.
          </p>
        ) : null}
        <LoginForm next={next} />
        <p className="text-center text-sm text-[var(--muted)]">
          Non hai un account?{" "}
          <Link
            href="/register"
            className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Registrati
          </Link>
        </p>
      </div>
    </div>
  );
}
