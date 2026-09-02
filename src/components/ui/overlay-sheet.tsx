"use client";

import { useEffect, useId, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function OverlaySheet({ open, title, onClose, children, footer }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[rgb(7_15_26_/_0.55)]"
        aria-label="Chiudi"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[81] flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] sm:rounded-2xl"
        style={{
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <h2
            id={titleId}
            className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]"
          >
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-[var(--muted)] active:bg-[var(--tint)]"
            onClick={onClose}
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-[var(--line)] px-4 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
