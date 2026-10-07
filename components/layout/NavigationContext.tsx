"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface NavigationContextType {
  isNavigating: boolean;
  targetHref: string | null;
  startNavigation: (href: string) => void;
  resetNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
  targetHref: null,
  startNavigation: () => {},
  resetNavigation: () => {},
});

const clean = (href: string) => href.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";

/**
 * Tracks page-to-page navigation so the shell can show a progress bar. Sidebar / command palette
 * call startNavigation; any other in-app link click is picked up automatically.
 */
export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const pathname = usePathname();
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetNavigation = useCallback(() => {
    if (safety.current) clearTimeout(safety.current);
    setTargetHref(null);
  }, []);

  const startNavigation = useCallback(
    (href: string) => {
      if (clean(href) === clean(pathname)) return;
      setTargetHref(href);
      // Never leave the bar stuck if a navigation is abandoned or fails.
      if (safety.current) clearTimeout(safety.current);
      safety.current = setTimeout(() => setTargetHref(null), 12000);
    },
    [pathname],
  );

  // Arrived: the pathname changed.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setTargetHref(null);
  }

  // Plain in-app <a>/<Link> clicks anywhere in the dashboard.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      startNavigation(url.pathname + url.search);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [startNavigation]);

  return (
    <NavigationContext.Provider value={{ isNavigating: targetHref !== null, targetHref, startNavigation, resetNavigation }}>
      {children}
    </NavigationContext.Provider>
  );
}

export const useNavigation = () => useContext(NavigationContext);
