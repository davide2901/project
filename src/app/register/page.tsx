import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Registrati · SuMisura",
};

export default function RegisterPage() {
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
            Crea il tuo account. Solo tu vedrai profilo e candidature.
          </p>
        </header>
        <RegisterForm />
      </div>
    </div>
  );
}
