"use client";

import { Loader2 } from "lucide-react";
import { DashboardContentWrapper } from "@/components/layout/DashboardContentWrapper";
import { ShellProvider, useShell } from "@/components/layout/ShellContext";
import { MobileTabBar, Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { RouteProgress } from "@/components/layout/RouteProgress";

function LogoutOverlay() {
  const { isLoggingOut } = useShell();
  if (!isLoggingOut) return null;
  return (
    <div className="animate-fade-in fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="animate-pop-in flex w-full max-w-xs flex-col items-center gap-4 rounded-card border border-border bg-card p-6 text-center shadow-pop">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft">
          <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
        </span>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Signing out</h3>
          <p className="text-xs text-muted-foreground">Ending your session…</p>
        </div>
      </div>
    </div>
  );
}

/** Sidebar + topbar + scrollable content area for every /dashboard page. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellProvider>
      <RouteProgress />
      <div className="flex h-dvh bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <main id="main-content" className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:pb-10 lg:px-8">
              <DashboardContentWrapper>{children}</DashboardContentWrapper>
            </div>
          </main>
        </div>
        <MobileTabBar />
        <LogoutOverlay />
      </div>
    </ShellProvider>
  );
}
