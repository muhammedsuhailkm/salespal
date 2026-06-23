"use client";

import { createContext, useContext, useState, useEffect } from "react";
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

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setNavigating] = useState(false);
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const pathname = usePathname();

  const startNavigation = (href: string) => {
    // Normalise paths (strip trailing slashes, queries, etc. for comparison)
    const cleanCurrent = pathname.replace(/\/$/, "");
    const cleanTarget = href.split("?")[0].split("#")[0].replace(/\/$/, "");

    if (cleanCurrent !== cleanTarget) {
      setTargetHref(href);
      setNavigating(true);
    }
  };

  const resetNavigation = () => {
    setNavigating(false);
    setTargetHref(null);
  };

  // Reset when pathname changes
  useEffect(() => {
    resetNavigation();
  }, [pathname]);

  return (
    <NavigationContext.Provider
      value={{ isNavigating, targetHref, startNavigation, resetNavigation }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export const useNavigation = () => useContext(NavigationContext);
