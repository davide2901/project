import type { CvSourceKind } from "@/lib/cv/resolve-source";
import type { JobPreference } from "@/lib/types/database";

type PromptProfile = {
  full_name: string | null;
  skills: string[];
  cv_fallback_text: string | null;
  job_preference: JobPreference;
  companies_of_interest: string[];
};

type PromptMeta = {
  cvSourceKind?: CvSourceKind;
  figmaError?: string;
};

export function buildSystemPrompt(
  profile: PromptProfile,
  meta: PromptMeta = {},
): string {
  const preferenceHint =
    profile.job_preference === "lavoro"
      ? "Il candidato cerca solo posizioni di lavoro (no stage/tirocinio/internship). Se l'offerta è stage, segnalalo in honesty_notes e non forzare un match."
      : profile.job_preference === "stage"
        ? "Il candidato cerca solo stage, tirocinio o internship. Se l'offerta è lavoro, segnalalo in honesty_notes e non forzare un match."
        : "Il candidato accetta sia lavoro sia stage/tirocinio/internship.";

  const sourceNote =
    meta.cvSourceKind === "figma"
      ? "Fonte CV: testo estratto da Figma (sola lettura file originale)."
      : meta.cvSourceKind === "fallback" && meta.figmaError
        ? `Fonte CV: FALLBACK testuale del profilo (Figma fallito: ${meta.figmaError}). Dichiaralo in honesty_notes.`
        : "Fonte CV: testo di profilo / fallback.";

  return `Sei un assistente per candidature di lavoro onesto e rigoroso per l'app SuMisura.

REGOLE D'ORO (obbligatorie):
1. ONESTÀ: puoi solo riformulare, riordinare priorità ed evidenziare competenze GIÀ presenti nel CV/profilo fornito sotto. VIETATO allucinare o inventare esperienze, titoli, tool, soft skill o risultati non presenti nel materiale originale.
2. FATTI WEB: sulla ricerca azienda riporta solo fatti verificabili (usa Google Search se disponibile). Se un'informazione non è reperibile, scrivi esattamente "non reperibile" e dichiaralo in unavailable_notes / honesty_notes.
3. STAGE: considera esplicitamente offerte di stage, tirocinio e internship. Classifica position_type di conseguenza. ${preferenceHint}
4. LINGUA: rispondi in italiano, tono professionale e chiaro.
5. OUTPUT: rispondi SOLO con un oggetto JSON completo e valido conforme allo schema richiesto (nessun markdown, nessun testo fuori dal JSON).

Contesto candidato:
- Nome: ${profile.full_name?.trim() || "non indicato"}
- Preferenza: ${profile.job_preference}
- Competenze dichiarate: ${profile.skills.length ? profile.skills.join(", ") : "nessuna elencata"}
- Aziende di interesse: ${
    profile.companies_of_interest.length
      ? profile.companies_of_interest.join(", ")
      : "nessuna"
  }
- ${sourceNote}

Materiale CV originale (unica base fattuale — non inventare nulla fuori da qui):
---
${profile.cv_fallback_text?.trim() || "(CV non fornito: usa solo le competenze elencate; segnala il limite in honesty_notes)"}
---`;
}

export function buildUserPrompt(offerInput: string): string {
  return `Analizza questa offerta di lavoro (testo e/o URL).

Usa Google Search se serve per:
- chiarire azienda/ruolo da un URL
- raccogliere fatti reali sull'azienda (settore, sede, dimensioni, prodotti, culture se documentate)

Poi genera il pacchetto candidatura come JSON strutturato.

OFFERTA:
---
${offerInput.trim()}
---`;
}
