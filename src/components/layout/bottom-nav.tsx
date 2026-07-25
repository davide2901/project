"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "Home", match: (p: string) => p === "/home" },
  {
    href: "/archivio",
    label: "Archivio",
    match: (p: string) => p.startsWith("/archivio"),
  },
  {
    href: "/profilo",
    label: "Profilo",
    match: (p: string) => p.startsWith("/profilo"),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] backdrop-blur-md"
      aria-label="Navigazione principale"
    >
      <div className="mx-auto grid max-w-3xl grid-cols-3 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 rounded-md px-2 py-2 text-xs font-medium transition ${
                active
                  ? "text-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`h-1 w-1 rounded-full ${
                  active ? "bg-[var(--accent)]" : "bg-transparent"
                }`}
                aria-hidden
              />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
