"use client";

import Link from "next/link";

import { signOut } from "@/app/actions/auth";

type Props = {
  email?: string | null;
};

function initialsFromEmail(email?: string | null) {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "?";
  return local.slice(0, 1).toUpperCase();
}

/** Avatar → pagina Account (niente dropdown/tooltip). */
export function HeaderMenu({ email }: Props) {
  return (
    <Link
      href="/account"
      className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink)] transition hover:border-[color-mix(in_oklab,var(--accent)_40%,var(--line))] active:bg-[var(--tint)]"
      aria-label="Account"
      title="Account"
    >
      {initialsFromEmail(email)}
    </Link>
  );
}

/** Usato in pagina Account se serve logout fuori dal form server. */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="btn-secondary w-full sm:w-auto">
        Esci
      </button>
    </form>
  );
}
