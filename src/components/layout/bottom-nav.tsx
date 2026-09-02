"use client";

import { useTabNav } from "@/components/layout/tab-app";
import {
  pathToTab,
  type TabId,
} from "@/lib/tabs/bootstrap";
import { usePathname } from "next/navigation";

const ITEMS: {
  id: TabId;
  label: string;
  shortLabel?: string;
  icon: typeof HomeIcon;
}[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  {
    id: "archivio",
    label: "Candidature",
    shortLabel: "Archivio",
    icon: FolderIcon,
  },
  {
    id: "statistiche",
    label: "Statistiche",
    shortLabel: "Stats",
    icon: ChartIcon,
  },
  { id: "profilo", label: "CV", icon: CvIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  const { tab, navigateTab, isTabMode } = useTabNav();

  const activeId: TabId | null = isTabMode
    ? tab
    : pathToTab(pathname) ??
      (pathname.startsWith("/archivio") || pathname.startsWith("/candidatura")
        ? "archivio"
        : pathname.startsWith("/profilo")
          ? "profilo"
          : pathname.startsWith("/statistiche")
            ? "statistiche"
            : pathname.startsWith("/home")
              ? "home"
              : null);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--background)] pb-[env(safe-area-inset-bottom)]"
      aria-label="Navigazione principale"
      style={{
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around px-1 pt-1">
        {ITEMS.map((item) => {
          const active = activeId != null && item.id === activeId;
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                onClick={() => navigateTab(item.id)}
                className={`flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-0.5 px-1 transition ${
                  active
                    ? "font-semibold text-[var(--accent)]"
                    : "font-medium text-[var(--muted)]"
                }`}
              >
                <Icon active={active} />
                <span className="max-w-full truncate text-[0.65rem] leading-tight tracking-wide">
                  {item.shortLabel ? (
                    <>
                      <span className="sm:hidden">{item.shortLabel}</span>
                      <span className="hidden sm:inline">{item.label}</span>
                    </>
                  ) : (
                    item.label
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
      />
    </svg>
  );
}

function FolderIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-10Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
      />
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19V5M4 19h16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {active ? (
        <>
          <rect x="7" y="11" width="2.5" height="5" rx="0.5" fill="currentColor" />
          <rect x="11.25" y="8" width="2.5" height="8" rx="0.5" fill="currentColor" />
          <rect x="15.5" y="12" width="2.5" height="4" rx="0.5" fill="currentColor" />
        </>
      ) : (
        <path
          d="M8 16V11M12 16V8M16 16v-5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function CvIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3.75h7.5L19 8.25V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.75a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
      />
      <path
        d="M14 3.75V8h4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        opacity={active ? 0.35 : 1}
      />
      <path
        d="M9 12h6M9 15.5h6"
        stroke={active ? "var(--background)" : "currentColor"}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
