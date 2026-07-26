import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Registrati · SuMisura",
};

export const viewport: Viewport = {
  themeColor: "#eef2f6",
  colorScheme: "light",
  viewportFit: "cover",
};

export default function RegisterPage() {
  return (
    <div
      className="app-canvas flex min-h-dvh flex-1 items-center justify-center px-4 py-10"
      style={{
        paddingTop: "max(2.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="w-full max-w-md animate-fade-up space-y-8">
        <header className="space-y-2">
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
            Crea il tuo account
          </h1>
        </header>
        <RegisterForm />
      </div>
    </div>
  );
}
