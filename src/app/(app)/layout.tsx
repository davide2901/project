import type { Viewport } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { loadTabsBootstrap, type TabsBootstrap } from "@/lib/tabs/bootstrap";

/** Status bar / theme iOS dentro l'app (carta chiara). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#eef2f6",
  colorScheme: "light",
};

const emptyBootstrap: TabsBootstrap = {
  home: { count: 0, firstName: null, profileReady: false, offers: [] },
  archivio: { items: [], error: null },
  statistiche: {
    total: 0,
    lavoro: 0,
    stage: 0,
    byStatus: {},
    latest: null,
  },
  profilo: {
    profile: null,
    error: null,
    figmaOAuthConfigured: false,
    figmaStatus: {
      connected: false,
      figma_handle: null,
      figma_email: null,
      connected_at: null,
    },
  },
};

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const bootstrap = session?.user
    ? await loadTabsBootstrap(supabase, session.user.id)
    : emptyBootstrap;

  return (
    <AppShell email={session?.user?.email} bootstrap={bootstrap}>
      {children}
    </AppShell>
  );
}
