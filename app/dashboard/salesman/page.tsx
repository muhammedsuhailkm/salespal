import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import {
  calculateKpiScoreProgress,
  getKpiScoreBreakdown,
  type KpiBreakdownItem,
} from "@/lib/kpi";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { DonutChart } from "@mantine/charts";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { StatCard, type StatCardTheme } from "@/components/dashboard/StatCard";
import { UserCheck, Phone, Sparkles, XCircle, ListChecks } from "lucide-react";
import { MonthlyActivityChart } from "@/components/dashboard/MonthlyActivityChart";
import { OrderMonthlyChart } from "@/components/orders/OrderMonthlyChart";
import { TaskOverview } from "@/components/dashboard/TaskOverview";
import { cn } from "@/lib/utils";
import {
  getCachedSalesmanInfo,
  getCachedClientStatusCounts,
  getCachedMonthLogs,
  getCachedSalesmanTasks,
  getCachedOnboardedByMonth,
  getMonthlyOrderStats,
} from "@/lib/cached-queries";
import { orderStatsScope } from "@/lib/scoping";

/* ── Skeleton fragments for each Suspense boundary ── */

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-3xl border border-slate-200 bg-white p-5 animate-pulse">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <div className="mt-5 flex items-end justify-between gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

function KpiScoreSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-3 w-72 max-w-full" />
      <div className="mt-6 grid items-center gap-10 md:grid-cols-2">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-[200px] w-[200px] rounded-full" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
      <Skeleton className="h-4 w-40 mb-5" />
      <Skeleton className="h-[240px] w-full rounded-xl" />
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
      <Skeleton className="h-4 w-32 mb-5" />
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 p-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── KPI Score Ring + Breakdown ── */

function breakdownTone(status: string, weight: number) {
  if (status === "onboarded" || status === "active_client") {
    return { dot: "bg-emerald-500", bar: "bg-emerald-500" };
  }
  if (weight < 0) return { dot: "bg-rose-500", bar: "bg-rose-500" };
  if (status === "inactive") return { dot: "bg-slate-400", bar: "bg-slate-400" };
  return { dot: "bg-teal-500", bar: "bg-teal-500" };
}

function donutTone(status: string, weight: number) {
  if (status === "onboarded" || status === "active_client") return "green.6";
  if (weight < 0) return "pink.6";
  if (status === "inactive") return "gray.5";
  return "teal.6";
}

function KpiScoreSection({
  progress,
  breakdown,
}: {
  progress: ReturnType<typeof calculateKpiScoreProgress>;
  breakdown: KpiBreakdownItem[];
}) {
  const { score, maxScore, percent, totalClients, remaining } = progress;

  // A donut can only plot non-negative shares — points lost to "lost"/"cancelled"
  // clients still show up (as negative numbers) in the list below.
  const donutData = breakdown
    .filter((item) => item.points > 0)
    .map((item) => ({
      name: item.label,
      value: item.points,
      color: donutTone(item.status, item.weight),
    }));

  return (
    <div className="grid items-center gap-10 md:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-[200px] w-[200px] items-center justify-center">
          {donutData.length > 0 ? (
            <DonutChart
              data={donutData}
              size={200}
              thickness={22}
              paddingAngle={3}
              withTooltip
              tooltipDataSource="segment"
              strokeWidth={0}
            />
          ) : (
            <div className="h-[200px] w-[200px] rounded-full border-[22px] border-slate-100" />
          )}
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
            aria-label={`KPI score ${score} out of ${maxScore} points`}
          >
            <span className="text-[40px] font-semibold leading-none text-slate-900 tabular-nums">
              {percent}
              <span className="text-2xl font-semibold text-slate-400">%</span>
            </span>
            <span className="mt-2 text-xs font-medium text-slate-500">
              {score} of {maxScore} pts
            </span>
          </div>
        </div>

        <p className="max-w-[200px] text-center text-xs text-slate-500">
          {totalClients === 0
            ? "No clients assigned yet"
            : maxScore > 0 && remaining > 0
              ? `${remaining} pt${remaining === 1 ? "" : "s"} left to reach full potential`
              : totalClients > 0
                ? "Full pipeline potential reached"
                : null}
        </p>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-medium text-slate-400">Where your points come from</p>
        {breakdown.length > 0 ? (
          <div className="space-y-3.5">
            {breakdown.map((item) => {
              const tone = breakdownTone(item.status, item.weight);
              const barPct =
                maxScore > 0
                  ? Math.min(Math.max((item.points / maxScore) * 100, 0), 100)
                  : 0;
              return (
                <div key={item.status}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 capitalize text-slate-700">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", tone.dot)} />
                      {item.label}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      {item.count} × {item.weight} ={" "}
                      <span className="font-semibold text-slate-900">
                        {item.points} pt{item.points === 1 ? "" : "s"}
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", tone.bar)}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No client activity yet.</p>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Async Server Components (each one is a Suspense boundary)
   ══════════════════════════════════════════════════════════════ */

const STATUS_CARD_CONFIG: {
  label: string;
  key: string;
  icon: typeof UserCheck;
  theme: StatCardTheme;
}[] = [
  {
    label: "Onboarded",
    key: "onboarded",
    icon: UserCheck,
    theme: { bg: "bg-teal-600" },
  },
  {
    label: "Follow up",
    key: "follow_up",
    icon: Phone,
    theme: { bg: "bg-violet-600" },
  },
  {
    label: "Leads",
    key: "lead",
    icon: Sparkles,
    theme: { bg: "bg-blue-600" },
  },
  {
    label: "Lost",
    key: "lost",
    icon: XCircle,
    theme: { bg: "bg-slate-800" },
  },
];

function countByAction(logs: { action: string }[], keyword: string) {
  return logs.filter((l) => l.action.toLowerCase().includes(keyword)).length;
}

async function KpiCardsSection({ userId }: { userId: number }) {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [counts, thisMonthLogs, lastMonthLogs] = await Promise.all([
    getCachedClientStatusCounts(userId),
    getCachedMonthLogs(userId, thisMonthStart.toISOString()),
    getCachedMonthLogs(userId, lastMonthStart.toISOString(), lastMonthEnd.toISOString()),
  ]);

  const pctChanges: Record<string, number> = {};
  const lastMonthCounts: Record<string, number> = {};
  for (const card of STATUS_CARD_CONFIG) {
    const thisCount = countByAction(thisMonthLogs, card.key);
    const lastCount = countByAction(lastMonthLogs, card.key);
    const denom = Math.max(lastCount, 1);
    pctChanges[card.key] = Math.round(((thisCount - lastCount) / denom) * 100);
    lastMonthCounts[card.key] = lastCount;
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATUS_CARD_CONFIG.map((card) => {
        const pct = pctChanges[card.key] ?? 0;
        return (
          <StatCard
            key={card.key}
            icon={card.icon}
            label={card.label}
            value={counts[card.key as keyof typeof counts] ?? 0}
            badgeLabel={`${pct > 0 ? "+" : ""}${pct}%`}
            badgeDirection={pct > 0 ? "up" : pct < 0 ? "down" : "flat"}
            caption={
              <>
                Vs last month:{" "}
                <span className="font-semibold text-white">{lastMonthCounts[card.key] ?? 0}</span>
              </>
            }
            theme={card.theme}
          />
        );
      })}
    </div>
  );
}

async function KpiScoreCard({ userId }: { userId: number }) {
  const counts = await getCachedClientStatusCounts(userId);
  const totalClients = Object.values(counts).reduce((a, b) => a + b, 0);
  const kpiProgress = calculateKpiScoreProgress(counts, totalClients);
  const kpiBreakdown = getKpiScoreBreakdown(counts);

  return (
    <SectionCard
      title="KPI score"
      subtitle={`Points from your ${totalClients} client${totalClients === 1 ? "" : "s"} — max ${kpiProgress.maxScore} if all reach onboarded`}
    >
      <KpiScoreSection progress={kpiProgress} breakdown={kpiBreakdown} />
    </SectionCard>
  );
}

async function MonthlyChartSection({ userId }: { userId: number }) {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const onboardedByMonth = await getCachedOnboardedByMonth(userId, sixMonthsAgo.toISOString());

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartDataMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
    chartDataMap[key] = 0;
  }
  for (const row of onboardedByMonth) {
    const d = new Date(row.created_at);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
    if (key in chartDataMap) {
      chartDataMap[key] += row._count.id;
    }
  }
  const chartData = Object.entries(chartDataMap).map(([month, count]) => ({
    month,
    count,
  }));

  return (
    <SectionCard title="Monthly onboarded" subtitle="Clients onboarded, last 6 months">
      <MonthlyActivityChart data={chartData} />
    </SectionCard>
  );
}

const ORDER_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

async function OrderStatsSection({ userId }: { userId: number }) {
  const scope = await orderStatsScope({ id: userId, role_id: 3 });
  const stats = await getMonthlyOrderStats(scope);

  const now = new Date();
  const chartDataMap: Record<string, { totalCollected: number; totalPending: number; orderCount: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${ORDER_MONTH_NAMES[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
    chartDataMap[key] = { totalCollected: 0, totalPending: 0, orderCount: 0 };
  }
  for (const row of stats) {
    const d = new Date(row.month);
    const key = `${ORDER_MONTH_NAMES[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
    if (key in chartDataMap) {
      chartDataMap[key] = {
        totalCollected: row.totalCollected,
        totalPending: row.totalPending,
        orderCount: row.orderCount,
      };
    }
  }
  const chartData = Object.entries(chartDataMap).map(([month, values]) => ({ month, ...values }));

  return (
    <SectionCard title="Orders: collected vs pending" subtitle="Last 6 months">
      <OrderMonthlyChart data={chartData} />
    </SectionCard>
  );
}

async function TasksSection({ userId }: { userId: number }) {
  const tasks = await getCachedSalesmanTasks(userId);

  return (
    <SectionCard title="My tasks" subtitle="Your next 5 by priority and due date">
      {tasks.length > 0 ? (
        <TaskOverview tasks={tasks} />
      ) : (
        <EmptyState
          icon={ListChecks}
          title="No tasks assigned yet"
          message="Tasks your manager assigns to you will show up here."
        />
      )}
    </SectionCard>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Page Component — streams each section independently
   ══════════════════════════════════════════════════════════════ */

export default async function SalesmanDashboardPage() {
  const session = await getSalesPalSession();
  const userId = session!.user.id;

  /* Header data is small — fetch it synchronously for immediate display */
  const user = await getCachedSalesmanInfo(userId);
  const salesmanName = user?.name ?? "Salesman";
  const orgName =
    user?.salesmanManager?.[0]?.manager?.managerOrgs?.[0]?.org?.name ?? "";
  const subtitle = orgName ? `${salesmanName} • ${orgName}` : salesmanName;

  return (
    <>
      <PageHeader title="My Performance" subtitle={subtitle} />

      <div className="space-y-5">
        {/* ─── 1. KPI Status Cards ─── */}
        <Suspense fallback={<KpiCardsSkeleton />}>
          <KpiCardsSection userId={userId} />
        </Suspense>

        {/* ─── 2. KPI Score (hero) ─── */}
        <Suspense fallback={<KpiScoreSkeleton />}>
          <KpiScoreCard userId={userId} />
        </Suspense>

        {/* ─── 3 & 4. Charts side by side on desktop ─── */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Suspense fallback={<ChartSkeleton />}>
            <MonthlyChartSection userId={userId} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <OrderStatsSection userId={userId} />
          </Suspense>
        </div>

        {/* ─── 5. Tasks Overview ─── */}
        <Suspense fallback={<TasksSkeleton />}>
          <TasksSection userId={userId} />
        </Suspense>
      </div>
    </>
  );
}
