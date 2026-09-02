"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  refreshTabs: () => void;
};

const TabNavContext = createContext<TabNavContextValue | null>(null);

export function useTabNav() {
  const ctx = useContext(TabNavContext);
  if (!ctx) {
    throw new Error("useTabNav must be used within TabAppProvider");
  }
  return ctx;
}

function pushTabUrl(href: string) {
  const prev =
    window.history.state && typeof window.history.state === "object"
      ? window.history.state
      : {};
  window.history.pushState({ ...prev, __NA: true }, "", href);
}

export function TabAppProvider({
  bootstrap: bootstrapProp,
  children,
}: {
  bootstrap: TabsBootstrap;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [tab, setTab] = useState<TabId>(() => pathToTab(pathname) ?? "home");
  const [shellPath, setShellPath] = useState(pathname);
  /** Copia locale aggiornata quando il server invia nuovi dati (router.refresh). */
  const [bootstrap, setBootstrap] = useState(bootstrapProp);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    setBootstrap(bootstrapProp);
  }, [bootstrapProp]);

  useEffect(() => {
    setShellPath(pathname);
    const fromPath = pathToTab(pathname);
    if (fromPath) setTab(fromPath);

    const wasOutsideTabs = !isMainTabPath(prevPathRef.current);
    const nowOnTab = isMainTabPath(pathname);
    prevPathRef.current = pathname;
    // Solo quando si torna da dettaglio/account a una tab: aggiorna i dati
    if (wasOutsideTabs && nowOnTab) {
      router.refresh();
    }
  }, [pathname, router]);

  useEffect(() => {
    function onPopState() {
      const p = window.location.pathname;
      setShellPath(p);
      const fromPath = pathToTab(p);
      if (fromPath) setTab(fromPath);
      if (isMainTabPath(p)) router.refresh();
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [router]);

  const isTabMode = isMainTabPath(shellPath);

  const refreshTabs = useCallback(() => {
    router.refresh();
  }, [router]);

  const navigateTab = useCallback(
    (next: TabId) => {
      const href = TAB_PATHS[next];
      setTab(next);

      if (isMainTabPath(window.location.pathname)) {
        setShellPath(href);
        pushTabUrl(href);
        router.refresh();
        return;
      }

      router.push(href);
    },
    [router],
  );

  const value = useMemo(
    () => ({ tab, navigateTab, isTabMode, bootstrap, refreshTabs }),
    [tab, navigateTab, isTabMode, bootstrap, refreshTabs],
  );

  return (
    <TabNavContext.Provider value={value}>{children}</TabNavContext.Provider>
  );
}

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
