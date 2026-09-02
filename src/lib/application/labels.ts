import type { ApplicationPackage } from "@/lib/ai/schema";
import type { ApplicationStatus } from "@/lib/types/database";

export function labelPosition(type: ApplicationPackage["position_type"]) {
  switch (type) {
    case "lavoro":
      return "Lavoro";
    case "stage":
      return "Stage / tirocinio / internship";
    default:
      return "Non chiaro dall'offerta";
  }
}

export const APPLICATION_STATUS_OPTIONS: {
  value: ApplicationStatus;
  label: string;
}[] = [
  { value: "ready", label: "Da inviare" },
  { value: "sent", label: "Inviata" },
  { value: "waiting", label: "In attesa" },
  { value: "interview", label: "Colloquio" },
  { value: "closed", label: "Chiusa" },
];

export function normalizeStatus(status: ApplicationStatus): ApplicationStatus {
  if (status === "draft") return "ready";
  if (status === "archived") return "closed";
  return status;
}

export function labelStatus(status: ApplicationStatus) {
  const normalized = normalizeStatus(status);
  return (
    APPLICATION_STATUS_OPTIONS.find((o) => o.value === normalized)?.label ??
    status
  );
}

export function companyInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}
