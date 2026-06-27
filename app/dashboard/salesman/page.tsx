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
import {
  getCachedSalesmanInfo,
  getCachedClientStatuses,
  getCachedMonthLogs,
  getCachedSalesmanTasks,
  getCachedOnboardedByMonth,
} from "@/lib/cached-queries";

/* ── Skeleton fragments for each Suspense boundary ── */

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-t-[3px] border-t-slate-200 space-y-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-3 w-20" />
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
      <div className="mt-5 grid items-center gap-8 md:grid-cols-2">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-[180px] w-[180px] rounded-full" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-3 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
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
      <Skeleton className="h-4 w-40 mb-4" />
      <Skeleton className="h-[240px] w-full rounded-xl" />
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
      <Skeleton className="h-4 w-32 mb-5" />
      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
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
   Async Server Components (each one is a Suspense boundary)
   ══════════════════════════════════════════════════════════════ */

const STATUS_CARD_CONFIG = [
  {
    label: "Onboarded",
    key: "onboarded",
    borderClass: "border-t-emerald-500",
    bgClass: "bg-white border border-emerald-100/50 shadow-sm",
    cardBgClass: "bg-emerald-50/60 border-emerald-100",
    textClass: "text-emerald-700",
    icon: UserCheck,
  },
  {
    label: "Follow Up",
    key: "follow_up",
    borderClass: "border-t-indigo-500",
    bgClass: "bg-white border border-indigo-100/50 shadow-sm",
    cardBgClass: "bg-indigo-50/60 border-indigo-100",
    textClass: "text-indigo-700",
    icon: Phone,
  },
  {
    label: "Leads",
    key: "lead",
    borderClass: "border-t-amber-500",
    bgClass: "bg-white border border-amber-100/50 shadow-sm",
    cardBgClass: "bg-amber-50/60 border-amber-100",
    textClass: "text-amber-700",
    icon: Sparkles,
  },
  {
    label: "Lost",
    key: "lost",
    borderClass: "border-t-red-500",
    bgClass: "bg-white border border-red-100/50 shadow-sm",
    cardBgClass: "bg-red-50/60 border-red-100",
    textClass: "text-red-700",
    icon: XCircle,
  },
] as const;

function countByAction(logs: { action: string }[], keyword: string) {
  return logs.filter((l) => l.action.toLowerCase().includes(keyword)).length;
}

async function KpiCardsSection({ userId }: { userId: number }) {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [clients, thisMonthLogs, lastMonthLogs] = await Promise.all([
    getCachedClientStatuses(userId),
    getCachedMonthLogs(userId, thisMonthStart.toISOString()),
    getCachedMonthLogs(userId, lastMonthStart.toISOString(), lastMonthEnd.toISOString()),
  ]);

  const counts = groupStatusCounts(clients);

  const pctChanges: Record<string, number> = {};
  for (const card of STATUS_CARD_CONFIG) {
    const thisCount = countByAction(thisMonthLogs, card.key);
    const lastCount = countByAction(lastMonthLogs, card.key);
    const denom = Math.max(lastCount, 1);
    pctChanges[card.key] = Math.round(((thisCount - lastCount) / denom) * 100);
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATUS_CARD_CONFIG.map((card) => {
        const Icon = card.icon;
        const pct = pctChanges[card.key] ?? 0;
        const count = counts[card.key as keyof typeof counts] ?? 0;
        return (
          <div
            key={card.key}
            className={`rounded-2xl border ${card.cardBgClass} p-5 shadow-sm border-t-[3px] ${card.borderClass} transition-all duration-200 hover:shadow-md`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`h-9 w-9 flex items-center justify-center rounded-xl ${card.bgClass}`}
              >
                <Icon size={18} className={card.textClass} />
              </div>
              {/* % change badge */}
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold bg-white shadow-sm border ${
                  pct > 0
                    ? "text-emerald-700 border-emerald-100/50"
                    : pct < 0
                      ? "text-red-700 border-red-100/50"
                      : "text-slate-500 border-slate-200/50"
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
              {count}
            </p>
            <p className="mt-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {card.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

async function KpiScoreCard({ userId }: { userId: number }) {
  const clients = await getCachedClientStatuses(userId);
  const counts = groupStatusCounts(clients);
  const totalClients = clients.length;
  const kpiProgress = calculateKpiScoreProgress(counts, totalClients);
  const kpiBreakdown = getKpiScoreBreakdown(counts);

  return (
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-4">
        Monthly Onboarded
      </h2>
      <MonthlyActivityChart data={chartData} />
    </div>
  );
}

async function TasksSection({ userId }: { userId: number }) {
  const tasks = await getCachedSalesmanTasks(userId);

  return (
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

      <div className="space-y-6">
        {/* ─── 1. KPI Status Cards ─── */}
        <Suspense fallback={<KpiCardsSkeleton />}>
          <KpiCardsSection userId={userId} />
        </Suspense>

        {/* ─── 2. KPI Score ─── */}
        <Suspense fallback={<KpiScoreSkeleton />}>
          <KpiScoreCard userId={userId} />
        </Suspense>

        {/* ─── 3. Monthly Activity Chart ─── */}
        <Suspense fallback={<ChartSkeleton />}>
          <MonthlyChartSection userId={userId} />
        </Suspense>

        {/* ─── 4. Tasks Overview ─── */}
        <Suspense fallback={<TasksSkeleton />}>
          <TasksSection userId={userId} />
        </Suspense>
      </div>
    </>
  );
}
