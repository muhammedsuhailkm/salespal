"use client";

import { useNavigation } from "@/components/layout/NavigationContext";
import SalesmanDashboardLoading from "@/app/dashboard/salesman/loading";
import ClientsLoading from "@/app/dashboard/salesman/clients/loading";
import TasksLoading from "@/app/dashboard/salesman/tasks/loading";

export function DashboardContentWrapper({ children }: { children: React.ReactNode }) {
  const { isNavigating, targetHref } = useNavigation();

  if (isNavigating && targetHref) {
    // Determine the skeleton based on the destination path
    const path = targetHref.split("?")[0].split("#")[0].replace(/\/$/, "");

    if (path.endsWith("/dashboard/salesman")) {
      return <SalesmanDashboardLoading />;
    }
    if (path.includes("/dashboard/salesman/clients")) {
      return <ClientsLoading />;
    }
    if (path.includes("/dashboard/salesman/tasks")) {
      return <TasksLoading />;
    }

    // Default loader fallback (uses dashboard summary skeleton)
    return <SalesmanDashboardLoading />;
  }

  return <>{children}</>;
}
