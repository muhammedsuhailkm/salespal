import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import {
  calculateKpiScoreProgress,
  getKpiScoreBreakdown,
  groupStatusCounts,
  type KpiBreakdownItem,
} from "@/lib/kpi";
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
import { getCachedDashboardData } from "@/lib/cached-queries";

/* ── KPI Score Ring + Breakdown ── */
function KpiScoreSection({
  progress,
  breakdown,
}: {
  progress: ReturnType<typeof calculateKpiScoreProgress>;
  breakdown: KpiBreakdownItem[];
}) {
  const { score, maxScore, percent, ringPercent, remaining, totalClients } =
    progress;
  const radius = 70;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ringPercent / 100);
  const strokeColor =
    percent >= 100 ? "#059669" : percent >= 50 ? "#0d9488" : "#d97706";

  return (
    <div className="grid items-center gap-8 md:grid-cols-2">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          <svg
            width={180}
            height={180}
            viewBox="0 0 180 180"
            className="-rotate-90 transform"
            aria-hidden
          >
            <circle
              cx={90}
              cy={90}
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={stroke}
            />
            <circle
              cx={90}
              cy={90}
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            aria-label={`KPI score ${score} out of ${maxScore} points`}
          >
            <span className="text-4xl font-bold leading-none text-slate-900 tabular-nums">
              {score}
            </span>
            <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              KPI Score
            </span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold tabular-nums text-slate-900">
            {score}
            <span className="mx-1 font-normal text-slate-300">/</span>
            {maxScore}
            <span className="ml-1.5 text-xs font-medium text-slate-500">
              points
            </span>
            {maxScore > 0 && (
              <span className="ml-2 text-xs font-bold text-teal-700">
                ({percent}%)
              </span>
            )}
          </p>
          <p className="mt-1 max-w-xs text-xs text-slate-500">
            {totalClients === 0
              ? "No clients assigned yet"
              : maxScore > 0 && remaining > 0
                ? `${remaining} pt${remaining === 1 ? "" : "s"} left if every client reaches onboarded (5 pts each)`
                : totalClients > 0
                  ? "Full pipeline potential reached"
                  : null}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            How your score is built
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Each client earns points by status — leads (1 pt) up to onboarded (5
            pts). Lost clients deduct 1 pt.
          </p>
        </div>

        {breakdown.length > 0 ? (
          <div className="space-y-3">
            {breakdown.map((item) => {
              const barPct =
                maxScore > 0
                  ? Math.min(Math.max((item.points / maxScore) * 100, 0), 100)
                  : 0;
              return (
                <div key={item.status}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="capitalize text-slate-700">{item.label}</span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      {item.count} × {item.weight} ={" "}
                      <span className="font-semibold text-slate-900">
                        {item.points} pt{item.points === 1 ? "" : "s"}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-teal-500 transition-all duration-500"
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
   Main Page Component (Server Component)
   ══════════════════════════════════════════════════════════════ */

export default async function SalesmanDashboardPage() {
  const session = await getSalesPalSession();
  const userId = session!.user.id;

  /* ── Fetch cached data ── */
  const {
    user,
    clients,
    thisMonthLogs,
    lastMonthLogs,
    tasks,
    onboardedByMonth,
  } = await getCachedDashboardData(userId);

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
  const kpiProgress = calculateKpiScoreProgress(counts, totalClients);
  const kpiBreakdown = getKpiScoreBreakdown(counts);

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
      label: "Leads",
      key: "lead",
      count: counts.lead ?? 0,
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

  // Monthly chart data — aggregate groupBy results into month buckets
  const now = new Date();
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

        {/* ─── 2. KPI Score ─── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            KPI Score
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Points from your {totalClients} client
            {totalClients === 1 ? "" : "s"} — max {kpiProgress.maxScore} if all
            reach onboarded
          </p>
          <div className="mt-5">
            <KpiScoreSection
              progress={kpiProgress}
              breakdown={kpiBreakdown}
            />
          </div>
        </div>

        {/* ─── 3. Monthly Activity Chart ─── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-4">
            Monthly Onboarded
          </h2>
          <MonthlyActivityChart data={chartData} />
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
