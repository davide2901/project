"use client";

import Link from "next/link";

import { useTabNav } from "@/components/layout/tab-app";
import type { TabId } from "@/lib/tabs/bootstrap";

/** Link interno alle 4 tab: switch client senza round-trip. */
export function TabLink({
  tab,
  children,
  className,
}: {
  tab: TabId;
  children: React.ReactNode;
  className?: string;
}) {
  const { navigateTab } = useTabNav();
  return (
    <button type="button" className={className} onClick={() => navigateTab(tab)}>
      {children}
    </button>
  );
}

export function ExternalAppLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
