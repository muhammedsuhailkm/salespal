import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSalesPalSession } from "@/lib/auth";
import { getCachedManagerOrg, getShippingRates } from "@/lib/cached-queries";
import { getManagerTeam } from "@/lib/manager-dashboard";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShippingRateTable } from "@/components/shipping-rates/ShippingRateTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonVariants } from "@/components/ui/Button";
import {
  ManagerKpiCardsRow,
  SalesmanPerformanceSection,
  FunnelAndTasksSection,
  ManagerActivityFeed,
  ManagerOrderStatsSection,
  ManagerKpiSkeleton,
  ManagerPerfSkeleton,
  ManagerFunnelTasksSkeleton,
  ManagerActivitySkeleton,
  ManagerOrderStatsSkeleton,
} from "@/components/dashboard/ManagerDashboardSections";

type PeriodKey = "this_month" | "last_month";

async function ShippingRatesSection() {
  const rates = await getShippingRates();
  return <ShippingRateTable initialRates={rates} />;
}

function ShippingRatesSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

/* ── Period Selector ── */
function PeriodSelector({ current }: { current: PeriodKey }) {
  return (
    <form className="flex items-center gap-2">
      <select
        name="period"
        defaultValue={current}
        className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 cursor-pointer"
      >
        <option value="this_month">This Month</option>
        <option value="last_month">Last Month</option>
      </select>
      <button
        type="submit"
        className={buttonVariants({ variant: "secondary", size: "sm" })}
      >
        Apply
      </button>
    </form>
  );
}

export default async function ManagerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await getSalesPalSession();
  if (!session) redirect("/login");

  const managerId = session.user.id;
  const params = await searchParams;
  const period = (
    ["this_month", "last_month"].includes(params.period ?? "")
      ? params.period
      : "this_month"
  ) as PeriodKey;

  // Fast cached data for header — org info + salesman count
  const [orgs, salesmen] = await Promise.all([
    getCachedManagerOrg(managerId),
    getManagerTeam(managerId),
  ]);

  const orgName = orgs.map((o) => o.name).join(" & ") || "Your Organization";
  const salesmanCount = salesmen.length;
  const subtitle = `${orgName} · ${salesmanCount} salesman${salesmanCount !== 1 ? "en" : ""}`;

  return (
    <>
      <PageHeader
        title="My Team Dashboard"
        subtitle={subtitle}
        action={<PeriodSelector current={period} />}
      />

      <div className="space-y-6">
        {/* ─── 1. KPI Summary Cards ─── */}
        <Suspense fallback={<ManagerKpiSkeleton />}>
          <ManagerKpiCardsRow managerId={managerId} period={period} />
        </Suspense>

        {/* ─── 2. Shipping Rates (read-only) ─── */}
        <Suspense fallback={<ShippingRatesSkeleton />}>
          <ShippingRatesSection />
        </Suspense>

        {/* ─── 3. Salesman Performance (Spotlight + Leaderboard) ─── */}
        <Suspense fallback={<ManagerPerfSkeleton />}>
          <SalesmanPerformanceSection managerId={managerId} />
        </Suspense>

        {/* ─── 4. Conversion Funnel + Pending Tasks ─── */}
        <Suspense fallback={<ManagerFunnelTasksSkeleton />}>
          <FunnelAndTasksSection managerId={managerId} />
        </Suspense>

        {/* ─── 5. Team Activity Feed ─── */}
        <Suspense fallback={<ManagerActivitySkeleton />}>
          <ManagerActivityFeed managerId={managerId} />
        </Suspense>

        {/* ─── 6. Order Stats Chart ─── */}
        <Suspense fallback={<ManagerOrderStatsSkeleton />}>
          <ManagerOrderStatsSection managerId={managerId} />
        </Suspense>
      </div>
    </>
  );
}
