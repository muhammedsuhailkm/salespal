"use client";

import { usePathname } from "next/navigation";

/**
 * Page content area. Each route fades in on arrival; while the next route loads, its own
 * loading.tsx skeleton shows (Next.js) and RouteProgress runs along the top.
 */
export function DashboardContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}
