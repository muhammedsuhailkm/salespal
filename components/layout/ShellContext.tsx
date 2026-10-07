"use client";

import { createContext, useCallback, useContext, useState, useSyncExternalStore } from "react";
import { signOut } from "next-auth/react";

type ShellContextValue = {
  /** Desktop sidebar expanded (true) or icon-only (false). Persisted. */
  expanded: boolean;
  toggleExpanded: () => void;
  /** Mobile navigation drawer. */
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  /** Link the user just clicked, highlighted before the route resolves. */
  pendingHref: string | null;
  setPendingHref: (href: string | null) => void;
  isLoggingOut: boolean;
  logout: () => Promise<void>;
};

const ShellContext = createContext<ShellContextValue | null>(null);

/* Sidebar expanded state lives in localStorage so it survives reloads. */
const SIDEBAR_KEY = "sidebarExpanded";
const sidebarListeners = new Set<() => void>();

function subscribeSidebar(listener: () => void) {
  sidebarListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    sidebarListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readSidebar() {
  try {
    const saved = window.localStorage.getItem(SIDEBAR_KEY);
    return saved === null ? true : Boolean(JSON.parse(saved));
  } catch {
    return true;
  }
}

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const expanded = useSyncExternalStore(subscribeSidebar, readSidebar, () => true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const toggleExpanded = useCallback(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, JSON.stringify(!readSidebar()));
    } catch {
      /* storage unavailable — nothing to persist */
    }
    sidebarListeners.forEach((listener) => listener());
  }, []);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  }, []);

  return (
    <ShellContext.Provider
      value={{ expanded, toggleExpanded, mobileOpen, setMobileOpen, pendingHref, setPendingHref, isLoggingOut, logout }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside <ShellProvider>");
  return ctx;
}
