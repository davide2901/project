/**
 * Placeholder per l'integrazione Anthropic Claude.
 *
 * NON implementare le chiamate LLM finché non è disponibile
 * il prototipo HTML con:
 * - struttura dei prompt
 * - JSON schema di output
 *
 * Flusso previsto (Fase 1):
 * 1. Input testo/link offerta
 * 2. Estrazione azienda/ruolo + keyword ATS
 * 3. Web search azienda (fatti reali o "non reperibile")
 * 4. CV ottimizzato (solo competenze presenti) + lettera + bozza email
 */

export const LLM_INTEGRATION_PENDING =
  "In attesa del prototipo HTML (prompt + JSON schema)." as const;
