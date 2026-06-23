import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateKpiScore, groupStatusCounts, KPI_WEIGHTS } from "@/lib/kpi";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import {
  UserCheck,
  Phone,
  Sparkles,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { MonthlyActivityChart } from "@/components/dashboard/MonthlyActivityChart";
import { TaskOverview } from "@/components/dashboard/TaskOverview";

/* ── KPI Score SVG Ring ── */
function KpiScoreRing({
  score,
  maxScore,
}: {
  score: number;
  maxScore: number;
}) {
  const radius = 70;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const safeMax = Math.max(maxScore, 1);
  const pct = Math.min(Math.max(score / safeMax, 0), 1);
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={180}
        height={180}
        viewBox="0 0 180 180"
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={90}
          cy={90}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        {/* Foreground arc */}
        <circle
          cx={90}
          cy={90}
          r={radius}
          fill="none"
          stroke="#0d9488"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900 leading-none">
          {score}
        </span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
          KPI Score
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Page Component (Server Component)
   ══════════════════════════════════════════════════════════════ */

export default async function SalesmanDashboardPage() {
  const session = await getSalesPalSession();
  const userId = session!.user.id;

  /* ── Date boundaries ── */
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // 6 months ago for chart
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  /* ── Parallel data fetching ── */
  const [
    user,
    clients,
    thisMonthLogs,
    lastMonthLogs,
    tasks,
    onboardedByMonth,
  ] = await Promise.all([
    // Salesman info + org via their manager relationship
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        salesmanManager: {
          select: {
            manager: {
              select: {
                managerOrgs: {
                  select: { org: { select: { name: true } } },
                  take: 1,
                },
              },
            },
          },
          take: 1,
        },
      },
    }),

    // All assigned clients with status
    prisma.client.findMany({
      where: { assigned_salesman_id: userId },
      select: { status: true },
    }),

    // Client logs this month
    prisma.clientLog.findMany({
      where: {
        done_by: userId,
        created_at: { gte: thisMonthStart },
      },
      select: { action: true },
    }),

    // Client logs last month
    prisma.clientLog.findMany({
      where: {
        done_by: userId,
        created_at: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      select: { action: true },
    }),

    // Tasks assigned to this salesman
    prisma.task.findMany({
      where: { assigned_to_id: userId },
      include: { assignedTo: { select: { name: true } } },
      orderBy: { due_date: "asc" },
      take: 50,
    }),

    // Onboarded by month (last 6 months) for chart
    prisma.clientLog.groupBy({
      by: ["created_at"],
      where: {
        done_by: userId,
        action: { contains: "onboarded" },
        created_at: { gte: sixMonthsAgo },
      },
      _count: { id: true },
    }),
  ]);

  /* ── Derived data ── */
  const salesmanName = user?.name ?? "Salesman";
  const orgName =
    user?.salesmanManager?.[0]?.manager?.managerOrgs?.[0]?.org?.name ?? "";
  const subtitle = orgName
    ? `${salesmanName} • ${orgName}`
    : salesmanName;

  // Status counts from current clients
  const counts = groupStatusCounts(clients);
  const totalClients = clients.length;

  // Count logs by action for this month and last month
  function countByAction(logs: { action: string }[], keyword: string) {
    return logs.filter((l) =>
      l.action.toLowerCase().includes(keyword),
    ).length;
  }

  const statusCards = [
    {
      label: "Onboarded",
      key: "onboarded",
      count: counts.onboarded ?? 0,
      borderClass: "border-t-emerald-500",
      bgClass: "bg-emerald-50/60",
      textClass: "text-emerald-700",
      icon: UserCheck,
    },
    {
      label: "Follow Up",
      key: "follow_up",
      count: counts.follow_up ?? 0,
      borderClass: "border-t-indigo-500",
      bgClass: "bg-indigo-50/60",
      textClass: "text-indigo-700",
      icon: Phone,
    },
    {
      label: "New Leads",
      key: "new_lead",
      count: counts.new_lead ?? 0,
      borderClass: "border-t-amber-500",
      bgClass: "bg-amber-50/60",
      textClass: "text-amber-700",
      icon: Sparkles,
    },
    {
      label: "Lost",
      key: "lost",
      count: counts.lost ?? 0,
      borderClass: "border-t-red-500",
      bgClass: "bg-red-50/60",
      textClass: "text-red-700",
      icon: XCircle,
    },
  ];

  // % change per status
  const pctChanges: Record<string, number> = {};
  for (const card of statusCards) {
    const thisCount = countByAction(thisMonthLogs, card.key);
    const lastCount = countByAction(lastMonthLogs, card.key);
    const denom = Math.max(lastCount, 1);
    pctChanges[card.key] = Math.round(((thisCount - lastCount) / denom) * 100);
  }

  // KPI Score
  const kpiScore = calculateKpiScore(counts);
  const maxScore = Math.max(totalClients * 5, 1);

  // Score breakdown bars
  const breakdownItems = [
    { label: "Onboarded", count: counts.onboarded ?? 0, weight: KPI_WEIGHTS.onboarded, color: "bg-emerald-500" },
    { label: "Follow Up", count: counts.follow_up ?? 0, weight: KPI_WEIGHTS.follow_up, color: "bg-indigo-500" },
    { label: "New Leads", count: counts.new_lead ?? 0, weight: KPI_WEIGHTS.new_lead, color: "bg-amber-500" },
    { label: "Lost", count: counts.lost ?? 0, weight: KPI_WEIGHTS.lost, color: "bg-red-500" },
  ];
  const maxBreakdownPoints = Math.max(
    ...breakdownItems.map((b) => Math.abs(b.count * b.weight)),
    1,
  );

  // Monthly chart data — aggregate groupBy results into month buckets
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

  // Pipeline breakdown
  const pipelineStatuses = [
    { key: "onboarded", label: "Onboarded", color: "bg-emerald-500" },
    { key: "follow_up", label: "Follow Up", color: "bg-indigo-500" },
    { key: "new_lead", label: "New Leads", color: "bg-amber-500" },
    { key: "target", label: "Target", color: "bg-violet-500" },
    { key: "lost", label: "Lost", color: "bg-red-500" },
  ];

  /* ══════════════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════════════ */
  return (
    <>
      <PageHeader title="My Performance" subtitle={subtitle} />

      <div className="space-y-6">
        {/* ─── 1. KPI Status Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statusCards.map((card) => {
            const Icon = card.icon;
            const pct = pctChanges[card.key] ?? 0;
            return (
              <div
                key={card.key}
                className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-t-[3px] ${card.borderClass} transition-all duration-200 hover:shadow-md`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`h-9 w-9 flex items-center justify-center rounded-xl ${card.bgClass}`}
                  >
                    <Icon size={18} className={card.textClass} />
                  </div>
                  {/* % change badge */}
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      pct > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : pct < 0
                          ? "bg-red-50 text-red-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {pct > 0 ? (
                      <TrendingUp size={10} />
                    ) : pct < 0 ? (
                      <TrendingDown size={10} />
                    ) : (
                      <Minus size={10} />
                    )}
                    {pct > 0 ? "+" : ""}
                    {pct}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900 leading-none">
                  {card.count}
                </p>
                <p className="mt-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {card.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* ─── 2. KPI Score Ring + Breakdown ─── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-5">
            KPI Score Breakdown
          </h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Ring */}
            <div className="flex justify-center">
              <KpiScoreRing score={kpiScore} maxScore={maxScore} />
            </div>

            {/* Breakdown bars */}
            <div className="space-y-4">
              {breakdownItems.map((item) => {
                const points = item.count * item.weight;
                const barPct =
                  maxBreakdownPoints > 0
                    ? Math.abs(points) / maxBreakdownPoints
                    : 0;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-700">
                        {item.label}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {points > 0 ? "+" : ""}
                        {points} pts
                        <span className="text-slate-400 font-medium ml-1">
                          ({item.count} × {item.weight})
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-500 ease-out`}
                        style={{ width: `${Math.max(barPct * 100, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── 3. Monthly Activity Chart + Pipeline Breakdown ─── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Activity */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-4">
              Monthly Onboarded
            </h2>
            <MonthlyActivityChart data={chartData} />
          </div>

          {/* Pipeline Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-1">
              Client Pipeline
            </h2>
            <p className="text-xs text-slate-500 font-medium mb-5">
              {totalClients} total client{totalClients !== 1 ? "s" : ""}
            </p>
            <div className="space-y-4">
              {pipelineStatuses.map((status) => {
                const c = counts[status.key] ?? 0;
                const pct =
                  totalClients > 0
                    ? Math.round((c / totalClients) * 100)
                    : 0;
                return (
                  <div key={status.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-700">
                        {status.label}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {c}{" "}
                        <span className="text-slate-400 font-medium">
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${status.color} transition-all duration-500 ease-out`}
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── 4. Tasks Overview ─── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-5">
            My Tasks
          </h2>
          {tasks.length > 0 ? (
            <TaskOverview tasks={tasks} />
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              No tasks assigned yet.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
