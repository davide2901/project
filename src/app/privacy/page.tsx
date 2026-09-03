import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy · SuMisura",
  description: "Informativa sulla privacy di SuMisura",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-10">
      <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
        ← SuMisura
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        Informativa privacy
      </h1>
      <p className="text-sm text-[var(--muted)]">Ultimo aggiornamento: settembre 2026</p>
      <div className="space-y-4 text-sm leading-relaxed text-[var(--ink)]">
        <p>
          SuMisura (&quot;noi&quot;) fornisce un assistente per candidature di lavoro.
          Titolare del trattamento: il gestore dell&apos;applicazione raggiungibile
          all&apos;indirizzo di produzione SuMisura.
        </p>
        <h2 className="text-base font-semibold">Dati che trattiamo</h2>
        <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
          <li>Account: email e dati profilo Google se accedi con Google</li>
          <li>CV, competenze e preferenze che inserisci</li>
          <li>Offerte e candidature generate nell&apos;app</li>
          <li>Log tecnici necessari al funzionamento (es. errori, autenticazione)</li>
        </ul>
        <h2 className="text-base font-semibold">Finalità</h2>
        <p className="text-[var(--muted)]">
          Prestare il servizio (ricerca offerte, generazione CV/lettera),
          autenticazione, sicurezza e miglioramento del prodotto.
        </p>
        <h2 className="text-base font-semibold">Base giuridica</h2>
        <p className="text-[var(--muted)]">
          Esecuzione del contratto di servizio e, dove richiesto, consenso
          (es. login social).
        </p>
        <h2 className="text-base font-semibold">Conservazione</h2>
        <p className="text-[var(--muted)]">
          I dati restano finché mantieni l&apos;account o finché necessari al
          servizio; puoi chiederne la cancellazione.
        </p>
        <h2 className="text-base font-semibold">Terze parti</h2>
        <p className="text-[var(--muted)]">
          Usiamo fornitori tecnici (hosting, database, autenticazione, modelli AI)
          esclusivamente per erogare SuMisura. L&apos;accesso con Google condivide
          con noi le informazioni di profilo consentite da Google.
        </p>
        <h2 className="text-base font-semibold">Diritti</h2>
        <p className="text-[var(--muted)]">
          Puoi richiedere accesso, rettifica, cancellazione o limitazione
          scrivendo all&apos;email di supporto dell&apos;account con cui ti sei
          registrato.
        </p>
      </div>
    </main>
  );
}
