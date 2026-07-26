"use client";

import { useTabNav } from "@/components/layout/tab-app";

export function BrandHomeLink() {
  const { navigateTab } = useTabNav();
  return (
    <button
      type="button"
      onClick={() => navigateTab("home")}
      className="font-[family-name:var(--font-display)] text-[1.35rem] tracking-tight text-[var(--ink)] sm:text-2xl"
    >
      SuMisura
    </button>
  );
}
