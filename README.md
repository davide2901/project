# SuMisura

Web app mobile-first per candidature su misura. Ogni utente vede solo i propri dati (Supabase Auth + RLS). Stack: Next.js App Router, Tailwind, Supabase, Google Gemini.

## Stato sviluppo

| Fase | Contenuto | Stato |
|------|-----------|--------|
| 1 | Setup, auth, profilo, Nuova Candidatura + Gemini | Completata |
| 2 | Link Figma personali + copia/incolla (multi-tenant) | Completata |
| 3 | Archivio applications | Completata |
| 4 | Discovery offerte dal web | Completata (Home → Offerte per te) |
| 5 | Cron discovery giornaliero | Completata (`/api/cron/discovery`) |

## Setup rapido

### 1. Dipendenze

```bash
npm install
cp .env.example .env.local
```

Compila almeno `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `GEMINI_API_KEY`.

### 2. Schema Supabase

Nel SQL Editor del progetto Supabase esegui in ordine:

1. [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)
2. [`supabase/migrations/002_applications.sql`](supabase/migrations/002_applications.sql)
3. [`supabase/migrations/003_rls_hardening.sql`](supabase/migrations/003_rls_hardening.sql)
4. [`supabase/migrations/004_security_advisor_fixes.sql`](supabase/migrations/004_security_advisor_fixes.sql)
5. [`supabase/migrations/005_discovered_offers.sql`](supabase/migrations/005_discovered_offers.sql)

Attiva **Email/Password** e (opzionale) **Google** in Authentication → Providers.

### Redirect URL (obbligatori per Google OAuth)

In Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://sumisura-eight.vercel.app` (o il tuo dominio)
- **Redirect URLs** (tutte le voci):
  - `http://localhost:3000/auth/callback`
  - `https://sumisura-eight.vercel.app/auth/callback`
  - `https://*.vercel.app/auth/callback` (preview)

In Google Cloud Console → OAuth Client → **Authorized redirect URIs**:

- `https://kmhaertikrtcvfotufgt.supabase.co/auth/v1/callback`

Poi in Supabase → Providers → Google: Client ID + Client Secret.

### 3. Avvio

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Regole d'oro

1. **Isolamento** — `public.users` è FK root; RLS su ogni tabella. Non esiste tabella `companies`.
2. **Figma multi-tenant** — nessun token/API Figma lato server. Ogni utente salva i **propri** link nel profilo; dopo la generazione «Apri in Figma» copia CV/lettera e apre quel file. Il CV per l’AI arriva dal testo profilo / competenze.
3. **Onestà AI** — riformulare/riordinare competenze esistenti; fatti web o “non reperibile”.
4. **Stage** — matching include stage/tirocinio/internship secondo `job_preference`.
5. **Fonte CV** — `resolveCvSource` usa `profiles.cv_fallback_text` (o competenze).

## Discovery (Fase 4)

In **Home**, con profilo completo (competenze o CV):

1. Tocca **Cerca offerte** → Gemini + Google Search
2. Le proposte restano in `discovered_offers` (status `new`)
3. **Genera** avvia la candidatura esistente; **Nascondi** marca `dismissed`

Mock: `USE_AI_MOCK=true` usa [`fixtures/discovery/offers.json`](fixtures/discovery/offers.json).

## Figma (Fase 2)

Nessuna variabile d’ambiente Figma. Flusso:

1. Nel **Profilo**, ogni utente inserisce i link ai propri file CV / portfolio
2. La generazione usa solo CV testuale / competenze
3. Nel risultato, **Apri in Figma** copia il testo e apre il link dell’utente

## Cron (Fase 5)

- Route: `GET /api/cron/discovery` con header `Authorization: Bearer {CRON_SECRET}`
- Schedule in [`vercel.json`](vercel.json): ogni giorno alle 07:00 UTC
- Serve anche `SUPABASE_SERVICE_ROLE_KEY` (solo server)

## Setup da smartphone

Guida in 4 passi: [`docs/SETUP-MOBILE.md`](docs/SETUP-MOBILE.md).

## Gemini

Prompt + JSON schema in `src/lib/ai/`. Chiave da [Google AI Studio](https://aistudio.google.com/apikey). Modello default: `gemini-2.5-flash` (override con `GEMINI_MODEL`).
