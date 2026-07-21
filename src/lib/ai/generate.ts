import Anthropic from "@anthropic-ai/sdk";

import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import {
  applicationPackageJsonSchema,
  applicationPackageSchema,
  type ApplicationPackage,
} from "@/lib/ai/schema";
import type { JobPreference } from "@/lib/types/database";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

type GenerateInput = {
  offerInput: string;
  profile: {
    full_name: string | null;
    skills: string[];
    cv_fallback_text: string | null;
    job_preference: JobPreference;
    companies_of_interest: string[];
  };
};

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY mancante. Aggiungila nelle variabili d'ambiente.",
    );
  }
  return new Anthropic({ apiKey });
}

function extractToolPayload(
  content: Anthropic.Messages.ContentBlock[],
): unknown {
  for (const block of content) {
    if (block.type === "tool_use" && block.name === "submit_application_package") {
      return block.input;
    }
  }
  return null;
}

function extractTextFallback(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function tryParseJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function generateApplicationPackage(
  input: GenerateInput,
): Promise<ApplicationPackage> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: buildSystemPrompt(input.profile),
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 5,
      },
      {
        name: "submit_application_package",
        description:
          "Invia il pacchetto candidatura finale in JSON strutturato. Obbligatorio.",
        input_schema: applicationPackageJsonSchema as unknown as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "auto" },
    messages: [
      {
        role: "user",
        content: buildUserPrompt(input.offerInput),
      },
    ],
  });

  let payload = extractToolPayload(response.content);

  if (!payload) {
    payload = tryParseJsonObject(extractTextFallback(response.content));
  }

  if (!payload) {
    throw new Error(
      "Claude non ha restituito un pacchetto strutturato. Riprova.",
    );
  }

  const parsed = applicationPackageSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      `Output AI non valido: ${parsed.error.issues
        .slice(0, 3)
        .map((i) => i.message)
        .join("; ")}`,
    );
  }

  return parsed.data;
}
