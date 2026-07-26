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

export function labelStatus(status: ApplicationStatus) {
  switch (status) {
    case "draft":
      return "Bozza";
    case "ready":
      return "Pronta";
    case "sent":
      return "Inviata";
    case "archived":
      return "Archiviata";
    default:
      return status;
  }
}

export function companyInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}
