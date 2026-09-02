import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { MarketingAuthShell } from "@/components/auth/marketing-auth-shell";

export const metadata: Metadata = {
  title: "Accedi · SuMisura",
};

export const viewport: Viewport = {
  themeColor: "#070f1a",
  colorScheme: "dark",
  viewportFit: "cover",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string; detail?: string }>;
};

function errorMessage(error?: string, detail?: string) {
  if (error === "oauth") {
    const lower = (detail ?? "").toLowerCase();
    if (
      lower.includes("provider is not enabled") ||
      lower.includes("unsupported provider")
    ) {
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
    <MarketingAuthShell
      title="Accedi"
      subtitle="Entra per completare il profilo, cercare offerte e generare i documenti."
      backHref="/"
      backLabel="← Torna alla home"
      alternateAuth={{ href: "/register", label: "Registrati" }}
      footer={
        <p>
          Non hai un account?{" "}
          <Link href="/register" className="text-link">
            Registrati gratis
          </Link>
        </p>
      }
    >
      {message ? (
        <p className="auth-alert-error rounded-md px-3 py-2 text-sm" role="alert">
          {message}
        </p>
      ) : null}
      <LoginForm next={next} variant="marketing" />
    </MarketingAuthShell>
  );
}
