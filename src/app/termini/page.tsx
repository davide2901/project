import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termini · SuMisura",
  description: "Termini di servizio di SuMisura",
};

export default function TerminiPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-10">
      <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
        ← SuMisura
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        Termini di servizio
      </h1>
      <p className="text-sm text-[var(--muted)]">Ultimo aggiornamento: settembre 2026</p>
      <div className="space-y-4 text-sm leading-relaxed text-[var(--ink)]">
        <p>
          Usando SuMisura accetti questi termini. Il servizio aiuta a cercare
          offerte e a preparare documenti di candidatura; non garantisce
          assunzioni né l&apos;accuratezza assoluta di contenuti generati da AI.
        </p>
        <h2 className="text-base font-semibold">Account</h2>
        <p className="text-[var(--muted)]">
          Sei responsabile delle credenziali e dei contenuti che carichi (CV,
          dati personali). Non usare l&apos;app in modo illecito o per
          danneggiare terzi.
        </p>
        <h2 className="text-base font-semibold">Contenuti AI</h2>
        <p className="text-[var(--muted)]">
          CV, lettere e insight sono suggerimenti: verifica sempre prima di
          inviarli. Stime retributive e opinioni su aziende possono essere
          incomplete o non aggiornate.
        </p>
        <h2 className="text-base font-semibold">Disponibilità</h2>
        <p className="text-[var(--muted)]">
          Il servizio è fornito &quot;così com&apos;è&quot;; possiamo modificarlo
          o sospenderlo. Limiti di quota AI o di terze parti possono ridurre
          alcune funzioni.
        </p>
        <h2 className="text-base font-semibold">Contatti</h2>
        <p className="text-[var(--muted)]">
          Per domande sui termini usa l&apos;email dell&apos;account con cui ti
          sei registrato.
        </p>
      </div>
    </main>
  );
}
