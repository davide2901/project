"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { ArchiveTabView } from "@/components/tabs/archive-tab-view";
import { HomeTabView } from "@/components/tabs/home-tab-view";
import { ProfileTabView } from "@/components/tabs/profile-tab-view";
import { StatsTabView } from "@/components/tabs/stats-tab-view";
import {
  isMainTabPath,
  pathToTab,
  TAB_PATHS,
  type TabId,
  type TabsBootstrap,
} from "@/lib/tabs/bootstrap";

type TabNavContextValue = {
  tab: TabId;
  navigateTab: (tab: TabId) => void;
  isTabMode: boolean;
  bootstrap: TabsBootstrap;
};

const TabNavContext = createContext<TabNavContextValue | null>(null);

export function useTabNav() {
  const ctx = useContext(TabNavContext);
  if (!ctx) {
    throw new Error("useTabNav must be used within TabAppProvider");
  }
  return ctx;
}

/**
 * Aggiorna l'URL senza soft-navigation Next (niente fetch RSC).
 * Con `__NA: true` il patch di Next salta ACTION_RESTORE.
 */
function pushTabUrl(href: string) {
  const prev =
    window.history.state && typeof window.history.state === "object"
      ? window.history.state
      : {};
  window.history.pushState({ ...prev, __NA: true }, "", href);
}

export function TabAppProvider({
  bootstrap,
  children,
}: {
  bootstrap: TabsBootstrap;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [tab, setTab] = useState<TabId>(() => pathToTab(pathname) ?? "home");
  /** Path “logico” delle tab: può divergere da usePathname dopo pushState senza restore. */
  const [shellPath, setShellPath] = useState(pathname);

  useEffect(() => {
    setShellPath(pathname);
    const fromPath = pathToTab(pathname);
    if (fromPath) setTab(fromPath);
  }, [pathname]);

  useEffect(() => {
    function onPopState() {
      const p = window.location.pathname;
      setShellPath(p);
      const fromPath = pathToTab(p);
      if (fromPath) setTab(fromPath);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const isTabMode = isMainTabPath(shellPath);

  const navigateTab = useCallback(
    (next: TabId) => {
      const href = TAB_PATHS[next];
      setTab(next);

      if (isMainTabPath(window.location.pathname)) {
        setShellPath(href);
        pushTabUrl(href);
        return;
      }

      router.push(href);
    },
    [router],
  );

  const value = useMemo(
    () => ({ tab, navigateTab, isTabMode, bootstrap }),
    [tab, navigateTab, isTabMode, bootstrap],
  );

  return (
    <TabNavContext.Provider value={value}>{children}</TabNavContext.Provider>
  );
}

/** Contenuto: tab keep-alive oppure pagina Next (dettaglio / nuova). */
export function TabOutlet({ children }: { children: ReactNode }) {
  const { tab, isTabMode, bootstrap } = useTabNav();

  if (!isTabMode) {
    return <>{children}</>;
  }

  return (
    <div>
      <section
        className={tab === "home" ? "block" : "hidden"}
        aria-hidden={tab !== "home"}
      >
        <HomeTabView data={bootstrap.home} />
      </section>
      <section
        className={tab === "archivio" ? "block" : "hidden"}
        aria-hidden={tab !== "archivio"}
      >
        <ArchiveTabView data={bootstrap.archivio} />
      </section>
      <section
        className={tab === "statistiche" ? "block" : "hidden"}
        aria-hidden={tab !== "statistiche"}
      >
        <StatsTabView data={bootstrap.statistiche} />
      </section>
      <section
        className={tab === "profilo" ? "block" : "hidden"}
        aria-hidden={tab !== "profilo"}
      >
        <ProfileTabView data={bootstrap.profilo} />
      </section>
    </div>
  );
}
