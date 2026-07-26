import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Accedi · SuMisura",
};

export const viewport: Viewport = {
  themeColor: "#eef2f6",
  colorScheme: "light",
  viewportFit: "cover",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string; detail?: string }>;
};

function errorMessage(error?: string, detail?: string) {
  if (error === "oauth") {
    const lower = (detail ?? "").toLowerCase();
    if (lower.includes("provider is not enabled") || lower.includes("unsupported provider")) {
      return "Google non è ancora abilitato su Supabase. Serve creare un OAuth Client su Google Cloud e attivare il provider (vedi docs/GOOGLE-AUTH.md).";
    }
    return detail
      ? `Accesso Google non riuscito: ${detail}`
      : "Accesso Google non riuscito. Verifica che Google sia attivo in Supabase Auth.";
  }
  if (error === "auth_callback") {
    return detail
      ? `Callback OAuth fallita: ${detail}`
      : "Callback OAuth fallita. Controlla i Redirect URL in Supabase.";
  }
  if (error) {
    return "Autenticazione non riuscita. Riprova.";
  }
  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/home";
  const message = errorMessage(params.error, params.detail);

  return (
    <div
      className="app-canvas flex min-h-dvh flex-1 items-center justify-center px-4 py-10"
      style={{
        paddingTop: "max(2.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="w-full max-w-md animate-fade-up space-y-8">
        <header className="space-y-3">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]"
          >
            SuMisura
          </Link>
          <p className="font-[family-name:var(--font-display)] text-base text-[var(--muted)]">
            Il tuo prossimo lavoro, su misura per te.
          </p>
          <h1 className="pt-2 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Accedi al tuo account
          </h1>
        </header>
        {message ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {message}
          </p>
        ) : null}
        <LoginForm next={next} />
        <p className="text-sm text-[var(--muted)]">
          Non hai un account?{" "}
          <Link
            href="/register"
            className="text-link"
          >
            Registrati
          </Link>
        </p>
      </div>
    </div>
  );
}
