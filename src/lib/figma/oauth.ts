import { createHash, randomBytes } from "crypto";

const SCOPES = ["file_content:read", "current_user:read"].join(",");

export function isFigmaOAuthConfigured(): boolean {
  return Boolean(
    process.env.FIGMA_CLIENT_ID?.trim() &&
      process.env.FIGMA_CLIENT_SECRET?.trim(),
  );
}

export function getFigmaRedirectUri(siteUrl: string): string {
  const override = process.env.FIGMA_REDIRECT_URI?.trim();
  if (override) return override;
  return `${siteUrl.replace(/\/$/, "")}/api/figma/callback`;
}

export function buildFigmaAuthorizeUrl(opts: {
  siteUrl: string;
  state: string;
}): string {
  const clientId = process.env.FIGMA_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("FIGMA_CLIENT_ID mancante.");
  }
  const url = new URL("https://www.figma.com/oauth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getFigmaRedirectUri(opts.siteUrl));
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", opts.state);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

export type FigmaTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user_id_string?: string;
};

function basicAuthHeader(): string {
  const id = process.env.FIGMA_CLIENT_ID?.trim() ?? "";
  const secret = process.env.FIGMA_CLIENT_SECRET?.trim() ?? "";
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

export async function exchangeFigmaCode(opts: {
  code: string;
  siteUrl: string;
}): Promise<FigmaTokenResponse> {
  const body = new URLSearchParams({
    redirect_uri: getFigmaRedirectUri(opts.siteUrl),
    code: opts.code,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://api.figma.com/v1/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body,
  });

  if (!res.ok) {
    throw new Error(
      `Scambio codice Figma fallito (${res.status}): ${await res.text()}`,
    );
  }

  return (await res.json()) as FigmaTokenResponse;
}

export async function refreshFigmaToken(
  refreshToken: string,
): Promise<FigmaTokenResponse> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://api.figma.com/v1/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body,
  });

  if (!res.ok) {
    throw new Error(
      `Refresh token Figma fallito (${res.status}): ${await res.text()}`,
    );
  }

  return (await res.json()) as FigmaTokenResponse;
}

export type FigmaMe = {
  id: string | number;
  email?: string;
  handle?: string;
};

export async function fetchFigmaMe(accessToken: string): Promise<FigmaMe> {
  const res = await fetch("https://api.figma.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`GET /v1/me fallito (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as FigmaMe;
}

export function createOAuthState(): string {
  return randomBytes(24).toString("hex");
}

export function createSyncCode(): string {
  // Codice leggibile per il plugin (es. SM-A1B2C3D4)
  const raw = randomBytes(4).toString("hex").toUpperCase();
  return `SM-${raw}`;
}

export function hashState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

export function expiresAtFromSeconds(expiresIn?: number): Date {
  const seconds = typeof expiresIn === "number" && expiresIn > 0 ? expiresIn : 7776000;
  // rinnova un po' prima
  return new Date(Date.now() + Math.max(60, seconds - 120) * 1000);
}
