import { createHash } from "crypto";

/** Fingerprint stabile per anti-duplicati candidature (attivo). */
export function createOfferFingerprint(
  companyName: string,
  roleTitle: string,
  offerSource: string,
): string {
  const raw = [
    companyName.trim().toLowerCase(),
    roleTitle.trim().toLowerCase(),
    offerSource.trim().slice(0, 800).toLowerCase(),
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}
