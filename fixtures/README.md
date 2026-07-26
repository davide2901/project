# Facsimile & mock AI

## Mock generazione (`USE_AI_MOCK=true`)

Con `USE_AI_MOCK=true` (e `NEXT_PUBLIC_USE_AI_MOCK=true`) la pagina **Nuova candidatura** non chiama Gemini: restituisce i JSON in `fixtures/applications/` in base al testo offerta.

| Keyword nell’offerta | Fixture |
|----------------------|---------|
| bending / spoons | `bending-spoons.json` |
| satispay / stage / tirocinio | `satispay-stage.json` |
| n26 / berlin / designer | `n26.json` |
| altro | fallback Bending Spoons |

In `.env.local`:

```
USE_AI_MOCK=true
NEXT_PUBLIC_USE_AI_MOCK=true
```

Per Gemini reale: `USE_AI_MOCK=false` (o rimuovi le variabili) e tieni `GEMINI_API_KEY`.

## Caricare profilo + 3 candidature in un colpo

1. Accedi
2. Apri `/dev/facsimile`
3. **Carica facsimile di test**

## Dati

| Path | Contenuto |
|------|-----------|
| `profile.json` | Profilo campione |
| `offers/*.txt` | Testi offerta |
| `applications/*.json` | Pacchetti AI |

## Mockup UI (solo riferimento visivo)

Vedi `docs/mockups/` — non sono mock runtime.
