import type { JobPreference } from "@/lib/types/database";

type PromptProfile = {
  full_name: string | null;
  skills: string[];
  cv_fallback_text: string | null;
  job_preference: JobPreference;
  companies_of_interest: string[];
};

export function buildSystemPrompt(profile: PromptProfile): string {
  const preferenceHint =
    profile.job_preference === "lavoro"
      ? "Il candidato cerca solo posizioni di lavoro (no stage/tirocinio/internship)."
      : profile.job_preference === "stage"
        ? "Il candidato cerca solo stage, tirocinio o internship."
        : "Il candidato accetta sia lavoro sia stage/tirocinio/internship.";

  return `Sei un assistente per candidature di lavoro onesto e rigoroso per l'app SuMisura.

REGOLE D'ORO (obbligatorie):
1. ONESTÀ: puoi solo riformulare, riordinare priorità ed evidenziare competenze GIÀ presenti nel CV/profilo. VIETATO inventare esperienze, titoli, tool o soft skill non presenti.
2. FATTI WEB: sulla ricerca azienda riporta solo fatti verificabili. Se un'informazione non è reperibile, scrivi esattamente "non reperibile" e dichiaralo in unavailable_notes / honesty_notes.
3. STAGE: considera esplicitamente offerte di stage, tirocinio e internship. Classifica position_type di conseguenza. ${preferenceHint}
4. LINGUA: rispondi in italiano, tono professionale e chiaro.
5. OUTPUT: al termine DEVI chiamare lo strumento submit_application_package con un payload JSON completo e valido.

Contesto candidato:
- Nome: ${profile.full_name?.trim() || "non indicato"}
- Preferenza: ${profile.job_preference}
- Competenze dichiarate: ${profile.skills.length ? profile.skills.join(", ") : "nessuna elencata"}
- Aziende di interesse: ${
    profile.companies_of_interest.length
      ? profile.companies_of_interest.join(", ")
      : "nessuna"
  }

CV testuale di partenza (fallback):
---
${profile.cv_fallback_text?.trim() || "(CV non fornito: usa solo le competenze elencate; segnala il limite in honesty_notes)"}
---`;
}

export function buildUserPrompt(offerInput: string): string {
  return `Analizza questa offerta di lavoro (testo e/o URL).

Usa web_search se serve per:
- chiarire azienda/ruolo da un URL
- raccogliere fatti reali sull'azienda (settore, sede, dimensioni, prodotti, culture se documentate)

Poi genera il pacchetto candidatura e invialo SOLO tramite submit_application_package.

OFFERTA:
---
${offerInput.trim()}
---`;
}
