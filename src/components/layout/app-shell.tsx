import Link from "next/link";

import { signOut } from "@/app/actions/auth";

const NAV = [
  { href: "/profilo", label: "Profilo" },
  { href: "/candidatura/nuova", label: "Nuova" },
  { href: "/archivio", label: "Archivio" },
];

type AppShellProps = {
  children: React.ReactNode;
  email?: string | null;
};

export function AppShell({ children, email }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/profilo"
            className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--ink)]"
          >
            SuMisura
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2.5 py-1.5 text-[var(--muted)] transition hover:bg-[var(--tint)] hover:text-[var(--ink)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        {email ? (
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-2 text-xs text-[var(--muted)]">
            <span className="truncate">{email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md px-2 py-1 hover:bg-[var(--tint)] hover:text-[var(--ink)]"
              >
                Esci
              </button>
            </form>
          </div>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
