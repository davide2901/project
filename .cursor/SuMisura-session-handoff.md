# SuMisura — Handoff sessione Cloud Agent

> Documento di continuità generato il 3 set 2026. Usalo come contesto per riprendere il lavoro su SuMisura da web/mobile (`cursor.com/agents`) o da un nuovo agent locale.

## Progetto

| Campo | Valore |
|-------|--------|
| **App** | SuMisura — assistente candidature (Italia) |
| **Path locale** | `/Users/davidedaloisio/massimo/project/project` |
| **Repo GitHub** | https://github.com/davide2901/project.git |
| **Branch** | `main` e `dev` allineati |
| **Produzione** | https://sumisura-eight.vercel.app |
| **Stack** | Next.js 16, Supabase, Gemini (`GEMINI_MODEL=gemini-3.5-flash`), Vercel, Tailwind |

## Utente / ambiente

- Email dev: `davide2901@gmail.com`
- User id Supabase: `68ca7617-667e-4951-88bc-e7eaeda38453`
- MCP disponibili: Supabase, Vercel, browser
- **Non committare** `.env.local` (contiene `GEMINI_API_KEY`, Supabase keys)
- Google Search grounding Gemini può andare in **quota 429** su tier free/pro → discovery degrada a JSON senza grounding

---

## Cronologia richieste (ordine approssimativo)

### UI / product (inizio sessione)
- Redesign landing vs login/account (tema diverso)
- Opzione A per palette (scuro ma più chiaro)
- Bottom nav: tab **CV** invece di Profilo
- Sezioni Home, Account, onboarding, statistiche, honesty checks
- Fix overlay modal: bordi laterali su mobile → **portal su `document.body`** in `overlay-sheet.tsx`

### Discovery offerte
- Ricerca offerte non funzionava → fix timeout (`POST /api/discovery`, `maxDuration=60`)
- Ricerche parallele multi-angolo (`multi-search.ts`)
- Modello default → `gemini-3.5-flash`
- Log strutturati JSON (`scope: discovery`)
- Gestione quota Gemini (messaggio utente chiaro, no fake "nessun match")
- Offerte già viste → scarto + secondo giro "alternative"
- Elimina offerta da Home → **hard delete** a DB (non soft dismiss)
- Ambiente dev isolato (branch `dev`, pulizia DB utente test)
- **Link inserzione** (ultimo commit): URL diretto da grounding + fallback Google "Cerca online"

### Navigazione / archivio
- Archivio → Home: fix redirect via `TabLink`
- Fingerprint candidature: migration `008_applications_fingerprint_soft_delete.sql`
- Conflitti duplicate application fingerprint risolti

### Export CV (Europass)
- Problema: PDF "buttava tutto a casaccio" → schema strutturato `european_cv`
- Template HTML Europass per PDF (`european-cv-template.ts`)
- Template Word ufficiale: `public/templates/cv-europass-word.docx` (da file utente)
- Fill DOCX via textbox XML (`europass-docx.ts`) — Word spezza testo in run (`Mari`+`a`+`Rossi`)
- Parser fallback `parse-cv-text.ts` per candidature vecchie senza `european_cv`
- Fix PDF 2 pagine → **1 pagina A4** (`height: 297mm`, font/padding ridotti)
- Fix DOCX bianco → fill a livello textbox
- **Nota:** candidature generate prima del deploy Europass (es. Pirelli) hanno `european_cv: null` → serve rigenerare candidatura per PDF/DOCX ottimali

### Link offerte (commit `71c6b1d`)
- `src/lib/discovery/offer-links.ts` — estrazione URL, grounding, fallback search
- Link su card offerte + overlay + pagina archivio candidatura
- `startApplicationFromOffer` salva sempre `Link:` o `Cerca online:` in `offer_source`

---

## Commit recenti (main)

```
71c6b1d Add direct job posting links and online search fallback for offers.
dfbd358 Fix blank Europass DOCX and single-page PDF export.
53faa8b Fix Europass CV export parsing and Word template fill.
384150e Add Europass Word template for CV PDF and DOCX export.
8f9fad1 Use structured European CV template for PDF export.
f563f07 Fix application fingerprint conflicts and Archivio Home navigation.
bf7a529 Widen offer discovery with parallel web search angles.
3059b53 Fix offer search timeouts and Gemini quota handling.
```

---

## Architettura file chiave

| Area | File |
|------|------|
| Discovery AI | `src/lib/ai/discover.ts`, `discovery-prompts.ts`, `discovery-schema.ts` |
| API discovery | `src/app/api/discovery/route.ts` |
| Actions | `src/app/actions/discovery.ts`, `application.ts` |
| UI offerte | `src/components/discovery/discovery-panel.tsx`, `offer-external-link.tsx` |
| Link offerte | `src/lib/discovery/offer-links.ts`, `application-offer-link.ts` |
| CV Europass | `src/lib/cv/european-cv-schema.ts`, `european-cv-template.ts`, `europass-docx.ts`, `parse-cv-text.ts` |
| Overlay | `src/components/ui/overlay-sheet.tsx` |
| DB types | `src/lib/types/database.ts` |

### Migrations Supabase rilevanti
- `005_discovered_offers.sql` — tabella offerte + `source_url`
- `008_applications_fingerprint_soft_delete.sql`

---

## Stato attuale / known issues

1. **Discovery quota Gemini** — con grounding esaurito, offerte plausibili ma spesso senza URL diretto; fallback "Cerca online" sempre disponibile
2. **Candidature pre-Europass** — rigenerare per export Word/PDF corretti
3. **LinkedIn / analisi profilo** — discussa fattibilità, non implementata; possibile su branch dev futuro
4. **Vercel env** — `GEMINI_API_KEY` va aggiornata su dashboard Vercel (Production + Preview se serve)

---

## Prossimi passi suggeriti (non implementati)

- Ridurre chiamate Search parallele quando quota esaurita
- Colonna `source_url` su `applications` (oggi link in `offer_source` testo)
- Integrazione LinkedIn OAuth / review profilo (fase 2)
- Backfill URL per offerte esistenti con nuova ricerca

---

## Come testare

```bash
cd project/project
npm install
npm run dev          # locale
npm test             # vitest
```

Discovery in prod: Home → "Cerca offerte" (richiede profilo con skills/CV + GEMINI_API_KEY su Vercel).

Export CV: Archivio → candidatura → scarica PDF/DOCX.

---

## Istruzioni per l'agent Cloud

1. Leggi questo file all'inizio di ogni sessione di continuità.
2. Branch di lavoro: `dev` per sperimentazione, `main` per produzione (user chiede spesso sync).
3. Commit/push **solo se richiesto** dall'utente.
4. Testare discovery/export su prod quando possibile (browser MCP o curl).
5. Rispondi in **italiano** all'utente Davide.
