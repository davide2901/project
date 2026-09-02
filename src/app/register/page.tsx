import type { Metadata, Viewport } from "next";

import { MarketingAuthShell } from "@/components/auth/marketing-auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Registrati · SuMisura",
};

export const viewport: Viewport = {
  themeColor: "#070f1a",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RegisterPage() {
  return (
    <MarketingAuthShell
      title="Crea account"
      subtitle="Tre passi: profilo, offerte, documenti pronti da inviare."
      backHref="/"
      backLabel="← Torna alla home"
      alternateAuth={{ href: "/login", label: "Accedi" }}
    >
      <RegisterForm variant="marketing" />
    </MarketingAuthShell>
  );
}
