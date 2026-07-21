# SuMisura

Web app mobile-first per candidature su misura. Ogni utente vede solo i propri dati (Supabase Auth + RLS). Stack: Next.js App Router, Tailwind, Supabase, Anthropic Claude (in arrivo), Figma API (Fase 2).

## Stato sviluppo

| Fase | Contenuto | Stato |
|------|-----------|--------|
| 1 | Setup, auth, profilo, Nuova Candidatura + Claude | Completata (schema allineabile al prototipo HTML) |
| 2 | Figma clone/pagina + text nodes + PDF | Pianificata |
| 3 | Archivio applications | Stub UI |
| 4 | Discovery aziende | Pianificata |
| 5 | Cron automation | Opzionale |

## Setup rapido

### 1. Dipendenze

```bash
npm install
cp .env.example .env.local
```

Compila `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.

### 2. Schema Supabase

Nel SQL Editor del progetto Supabase esegui:

[`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)

Attiva **Email/Password** e (opzionale) **Google** in Authentication → Providers. Redirect URL: `{SITE_URL}/auth/callback`.

### 3. Avvio

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Regole d'oro

1. **Isolamento** — `public.users` è FK root; RLS su ogni tabella.
2. **Figma** — mai sovrascrivere il file originale (solo copia/pagina dedicata).
3. **Onestà AI** — riformulare/riordinare competenze esistenti; fatti web o “non reperibile”.
4. **Stage** — matching include stage/tirocinio/internship secondo `job_preference`.

## Setup da smartphone

Guida in 4 passi: [`docs/SETUP-MOBILE.md`](docs/SETUP-MOBILE.md).

## Claude (Fase 1)

Prompt + JSON schema in `src/lib/ai/`. Se hai un prototipo HTML con prompt diversi, possiamo allinearli.
