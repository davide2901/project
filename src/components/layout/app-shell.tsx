import { HeaderMenu } from "@/components/layout/header-menu";
import { BottomNav } from "@/components/layout/bottom-nav";
import { BrandHomeLink } from "@/components/layout/brand-home-link";
import { TabAppProvider, TabOutlet } from "@/components/layout/tab-app";
import type { TabsBootstrap } from "@/lib/tabs/bootstrap";

type AppShellProps = {
  children: React.ReactNode;
  email?: string | null;
  bootstrap: TabsBootstrap;
};

export function AppShell({ children, email, bootstrap }: AppShellProps) {
  return (
    <TabAppProvider bootstrap={bootstrap}>
      <div
        className="app-canvas flex min-h-dvh flex-1 flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom))]"
        style={{
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        <header
          className="sticky top-0 z-40 bg-[color-mix(in_oklab,var(--background)_92%,transparent)] backdrop-blur-md"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <BrandHomeLink />
            </div>
            <HeaderMenu email={email} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-8 pt-2">
          <TabOutlet>{children}</TabOutlet>
        </main>
        <BottomNav />
      </div>
    </TabAppProvider>
  );
}
