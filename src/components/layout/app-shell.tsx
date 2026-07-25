import Link from "next/link";

import { BottomNav } from "@/components/layout/bottom-nav";

type AppShellProps = {
  children: React.ReactNode;
  email?: string | null;
};

function initialsFromEmail(email?: string | null) {
  if (!email) return "A";
  const local = email.split("@")[0] ?? "A";
  return local.slice(0, 1).toUpperCase();
}

export function AppShell({ children, email }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/home"
            className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--ink)]"
          >
            SuMisura
          </Link>
          <Link
            href="/account"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--tint)]"
            aria-label="Account"
          >
            {initialsFromEmail(email)}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 pb-28">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
