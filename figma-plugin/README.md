# Plugin Figma SuMisura

L’API REST di Figma **non scrive** text node. Questo plugin applica CV + lettera
scaricati da SuMisura con un **codice sync** monouso creato dopo «Genera candidatura».

## Installazione (dev)

1. Apri Figma Desktop → Plugins → Development → Import plugin from manifest…
2. Seleziona questo `manifest.json`
3. Nel file CV, crea (o rinomina) un text node `__cv_body__` oppure seleziona un text node

## Uso

1. In SuMisura genera una candidatura (con Link Figma CV nel profilo)
2. Copia il codice sync (es. `SM-A1B2C3D4`)
3. Nel file Figma: Plugins → Development → SuMisura
4. Incolla URL app + codice → Importa e applica

## API

`GET /api/figma/plugin/pull?code=SM-…` → JSON con `cv_text`, `cover_letter`, `node_name`.
