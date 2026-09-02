import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  alternateAuth?: { href: string; label: string };
  footer?: ReactNode;
  children: ReactNode;
};

export function MarketingAuthShell({
  title,
  subtitle = "Candidature allineate all'offerta, senza inventare competenze.",
  backHref = "/",
  backLabel = "← Torna alla home",
  alternateAuth,
  footer,
  children,
}: Props) {
  return (
    <div className="landing-night marketing-auth relative flex min-h-dvh flex-1 flex-col overflow-hidden">
      <div className="landing-light" aria-hidden />

      <header
        className="relative z-10 mx-auto flex w-full max-w-md items-center justify-between px-5 py-5"
        style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
      >
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--sand)]"
        >
          SuMisura
        </Link>
        <Link
          href={alternateAuth?.href ?? "/login"}
          className="inline-flex min-h-11 items-center px-2 text-sm text-[var(--sand-muted)] transition active:text-[var(--sand)]"
        >
          {alternateAuth?.label ?? "Accedi"}
        </Link>
      </header>

      <main
        className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16 pt-2"
        style={{ paddingBottom: "max(4rem, env(safe-area-inset-bottom))" }}
      >
        <div className="animate-fade-up space-y-8">
          <header className="space-y-3">
            <Link
              href={backHref}
              className="inline-flex min-h-10 items-center text-sm text-[var(--sand-muted)] transition active:text-[var(--sand)]"
            >
              {backLabel}
            </Link>
            <h1 className="font-[family-name:var(--font-display)] text-[2rem] leading-tight tracking-tight text-[var(--sand)]">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-[var(--sand-muted)]">
              {subtitle}
            </p>
          </header>

          {children}

          {footer ? (
            <div className="text-sm text-[var(--sand-muted)]">{footer}</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
