import {
  getCachedAdminClients,
  getCachedAdminLogsByAction,
  getCachedAdminLogCount,
  getCachedAdminTasks,
  getCachedAdminSalesmen,
  getCachedAdminActivityFeed,
  getCachedAdminManagers,
  getCachedAdminTrendData,
  getCachedAdminOrgs,
} from "@/lib/cached-queries";
import { calculateKpiScore, groupStatusCounts } from "@/lib/kpi";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  SmartAlertBanner,
  type AlertItem,
} from "@/components/dashboard/SmartAlertBanner";
import { MonthlyTrendChartWrapper } from "@/components/dashboard/MonthlyTrendChartWrapper";
import { cn, titleCase, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  ClipboardCheck,
  Zap,
  Users,
  BarChart3,
  Clock,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  XCircle,
} from "lucide-react";

/* ─── Helper: date range calculation ─── */
type PeriodKey = "this_month" | "last_month" | "quarter";

export function getPeriodRange(period: PeriodKey) {
  const now = new Date();
  let start: Date;
  let end: Date | undefined;

  if (period === "last_month") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (period === "quarter") {
    const quarter = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), quarter * 3, 1);
    end = undefined; // until now
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = undefined;
  }
  return { start, end };
}

function getPreviousPeriodRange(period: PeriodKey) {
  const now = new Date();
  if (period === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      0,
      23,
      59,
      59,
      999,
    );
    return { start, end };
  } else if (period === "quarter") {
    const quarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
    const end = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59, 999);
    return { start, end };
  } else {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end };
  }
}

/* ─── Delta badge component ─── */
function DeltaBadge({
  current,
  previous,
  invertColors,
}: {
  current: number;
  previous: number;
  invertColors?: boolean;
}) {
  const diff = current - previous;
  const pct =
    previous > 0 ? Math.round((diff / previous) * 100) : diff > 0 ? 100 : 0;

  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
        <Minus size={10} /> 0%
      </span>
    );
  }

  const isPositive = diff > 0;
  const isGood = invertColors ? !isPositive : isPositive;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        isGood ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
      )}
    >
      {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {isPositive ? "+" : ""}
      {pct}%
    </span>
  );
}






export async function KpiCardsRow({
  period,
  orgId,
}: {
  period: PeriodKey;
  orgId?: number;
}) {
  const { start, end } = getPeriodRange(period);
  const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(period);

  const [
    clients,
    onboardedLogsThis,
    onboardedLogsPrev,
    lostLogsThis,
    lostLogsPrev,
    tasks,
  ] = await Promise.all([
    getCachedAdminClients(orgId),
    getCachedAdminLogsByAction(
      "onboarded",
      start.toISOString(),
      end?.toISOString(),
    ),
    getCachedAdminLogsByAction(
      "onboarded",
      prevStart.toISOString(),
      prevEnd.toISOString(),
    ),
    getCachedAdminLogsByAction("lost", start.toISOString(), end?.toISOString()),
    getCachedAdminLogsByAction(
      "lost",
      prevStart.toISOString(),
      prevEnd.toISOString(),
    ),
    getCachedAdminTasks(),
  ]);

  const filterByOrg = (logList: typeof onboardedLogsThis) => {
    if (!orgId) return logList;
    return logList.filter((l) => l.client.org_id === orgId);
  };

  const currentOnboardedLogs = filterByOrg(onboardedLogsThis);
  const prevOnboardedLogs = filterByOrg(onboardedLogsPrev);
  const currentLostLogs = filterByOrg(lostLogsThis);
  const prevLostLogs = filterByOrg(lostLogsPrev);

  const isCurrentlyOnboarded = (status: string) =>
    ["onboarded", "active_client", "lost", "inactive"].includes(status);
  const isCurrentlyLost = (status: string) =>
    ["lost", "cancelled"].includes(status);

  const onboardedThisPeriod = currentOnboardedLogs.filter((l) =>
    isCurrentlyOnboarded(l.client.status)
  ).length;
  const onboardedPrevPeriod = prevOnboardedLogs.filter((l) =>
    isCurrentlyOnboarded(l.client.status)
  ).length;

  const lostThisPeriod = currentLostLogs.filter((l) =>
    isCurrentlyLost(l.client.status)
  ).length;
  const lostPrevPeriod = prevLostLogs.filter((l) =>
    isCurrentlyLost(l.client.status)
  ).length;

  const counts = groupStatusCounts(clients);
  const totalClients = clients.length;
  const onboardedClients = counts.onboarded ?? 0;
  const activePipeline = (counts.follow_up ?? 0) + (counts.lead ?? 0);
  const conversionRate =
    totalClients > 0 ? Math.round((onboardedClients / totalClients) * 100) : 0;
  const achievedTasks = tasks.filter((t) => t.status === "achieved").length;
  const taskCompletionRate =
    tasks.length > 0 ? Math.round((achievedTasks / tasks.length) * 100) : 0;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {/* Onboarded Card */}
      <div className="rounded-2xl border bg-emerald-50/60 border-emerald-100 p-5 shadow-sm border-t-[3px] border-t-emerald-500 transition-all duration-200 hover:shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-emerald-100/50 shadow-sm">
            <UserCheck size={18} className="text-emerald-700" />
          </div>
          <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold bg-white shadow-sm border text-emerald-700 border-emerald-100/50">
            <TrendingUp size={10} />
            {onboardedThisPeriod - onboardedPrevPeriod > 0 ? "+" : ""}
            {onboardedPrevPeriod > 0
              ? Math.round(((onboardedThisPeriod - onboardedPrevPeriod) / onboardedPrevPeriod) * 100)
              : onboardedThisPeriod > 0
                ? 100
                : 0}%
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900 leading-none">
          {onboardedThisPeriod}
        </p>
        <p className="mt-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Onboarded
        </p>
        <p className="mt-1 text-xs text-slate-400 font-medium">
          {onboardedClients} total onboarded
        </p>
      </div>

      {/* Active Pipeline Card */}
      <div className="rounded-2xl border bg-blue-50/60 border-blue-100 p-5 shadow-sm border-t-[3px] border-t-blue-500 transition-all duration-200 hover:shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-blue-100/50 shadow-sm">
            <Users size={18} className="text-blue-700" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900 leading-none">
          {activePipeline}
        </p>
        <p className="mt-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Active Pipeline
        </p>
        <p className="mt-1 text-xs text-slate-400 font-medium">
          Leads + follow-ups
        </p>
      </div>

      {/* Conversion Rate Card */}
      <div className="rounded-2xl border bg-amber-50/60 border-amber-100 p-5 shadow-sm border-t-[3px] border-t-amber-500 transition-all duration-200 hover:shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-amber-100/50 shadow-sm">
            <BarChart3 size={18} className="text-amber-700" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900 leading-none">
          {conversionRate}%
        </p>
        <p className="mt-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Conversion Rate
        </p>
        <p className="mt-1 text-xs text-slate-400 font-medium">
          {totalClients} leads → {onboardedClients} converted
        </p>
      </div>

      {/* Lost Clients Card */}
      <div className="rounded-2xl border bg-red-50/60 border-red-100 p-5 shadow-sm border-t-[3px] border-t-red-500 transition-all duration-200 hover:shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-red-100/50 shadow-sm">
            <XCircle size={18} className="text-red-700" />
          </div>
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold bg-white shadow-sm border ${
            lostThisPeriod - lostPrevPeriod > 0
              ? "text-red-700 border-red-100/50"
              : lostThisPeriod - lostPrevPeriod < 0
                ? "text-emerald-700 border-emerald-100/50"
                : "text-slate-500 border-slate-200/50"
          }`}>
            {lostThisPeriod - lostPrevPeriod > 0 ? (
              <TrendingUp size={10} />
            ) : lostThisPeriod - lostPrevPeriod < 0 ? (
              <TrendingDown size={10} />
            ) : (
              <Minus size={10} />
            )}
            {lostThisPeriod - lostPrevPeriod > 0 ? "+" : ""}
            {lostPrevPeriod > 0
              ? Math.round(((lostThisPeriod - lostPrevPeriod) / lostPrevPeriod) * 100)
              : lostThisPeriod > 0
                ? 100
                : 0}%
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900 leading-none">
          {lostThisPeriod}
        </p>
        <p className="mt-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Lost Clients
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Section 3: Company Hero Comparison
   ═══════════════════════════════════════════════════════ */

const STATUS_BAR_COLORS: Record<string, string> = {
  lead: "bg-amber-400",
  contacted: "bg-sky-400",
  follow_up: "bg-indigo-400",
  proposal_sent: "bg-violet-400",
  negotiation: "bg-orange-400",
  onboarding_in_progress: "bg-cyan-400",
  onboarded: "bg-emerald-400",
  active_client: "bg-green-400",
  inactive: "bg-slate-300",
  lost: "bg-rose-400",
  cancelled: "bg-red-400",
};

export async function CompanyHeroSection({
  period,
  orgId,
}: {
  period: PeriodKey;
  orgId?: number;
}) {
  const [clients, managers] = await Promise.all([
    getCachedAdminClients(),
    getCachedAdminManagers(),
  ]);

  // Group clients by org
  const orgMap = new Map<number, typeof clients>();
  for (const c of clients) {
    if (!orgMap.has(c.org_id)) orgMap.set(c.org_id, []);
    orgMap.get(c.org_id)!.push(c);
  }

  // Get the two orgs
  const orgIds = Array.from(orgMap.keys()).sort((a, b) => a - b);
  if (orgIds.length < 2) return null;

  const orgData = orgIds
    .slice(0, 2)
    .map((oid) => {
      const orgClients = orgMap.get(oid) ?? [];
      const counts = groupStatusCounts(orgClients);
      const kpiScore = calculateKpiScore(counts);
      const orgName = orgClients[0]?.organization.name ?? `Org ${oid}`;

      // Find manager for this org
      const mgr = managers.find((m) =>
        m.managerOrgs.some((mo) => mo.org.id === oid),
      );
      const managerName = mgr?.name ?? "Unassigned";

      // Team KPI (sum of all salesman KPIs under this manager)
      let teamKpi = 0;
      if (mgr) {
        for (const ms of mgr.managerSalesmen) {
          const smCounts = groupStatusCounts(ms.salesman.assignedClients);
          teamKpi += calculateKpiScore(smCounts);
        }
      }

      return {
        oid,
        orgName,
        counts,
        kpiScore,
        managerName,
        teamKpi,
        total: orgClients.length,
      };
    })
    .sort((a, b) => a.orgName.localeCompare(b.orgName));

  const betterIdx = orgData[0].kpiScore >= orgData[1].kpiScore ? 0 : 1;

  // If filtering by a single org, only show that one
  const displayData = orgId ? orgData.filter((d) => d.oid === orgId) : orgData;

  return (
    <div
      className={cn(
        "grid gap-4",
        displayData.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-1",
      )}
    >
      {displayData.map((d, idx) => {
        const isBetter = orgData.indexOf(d) === betterIdx && !orgId;
        return (
          <Card
            key={d.oid}
            className={cn(
              "rounded-2xl overflow-hidden",
              isBetter
                ? "ring-2 ring-emerald-200 bg-gradient-to-br from-white to-emerald-50/30"
                : "",
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">
                {d.orgName}
              </h3>
              {!orgId && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                    isBetter
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700",
                  )}
                >
                  {isBetter ? "★ Better Performer" : "⚠ Needs Attention"}
                </span>
              )}
            </div>

            {/* Stat boxes */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl bg-emerald-50/70 px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-emerald-700">
                  {d.counts.onboarded ?? 0}
                </p>
                <p className="text-[10px] font-semibold text-emerald-600 uppercase">
                  Onboarded
                </p>
              </div>
              <div className="rounded-xl bg-blue-50/70 px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-blue-700">
                  {(d.counts.lead ?? 0) + (d.counts.follow_up ?? 0)}
                </p>
                <p className="text-[10px] font-semibold text-blue-600 uppercase">
                  Active Leads
                </p>
              </div>
              <div className="rounded-xl bg-rose-50/70 px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-rose-700">
                  {d.counts.lost ?? 0}
                </p>
                <p className="text-[10px] font-semibold text-rose-600 uppercase">
                  Lost
                </p>
              </div>
            </div>

            {/* Pipeline breakdown bars */}
            <div className="space-y-1.5 mb-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Pipeline Breakdown
              </p>
              {d.total > 0 && (
                <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                  {Object.entries(d.counts)
                    .filter(([, count]) => count > 0)
                    .sort(
                      ([a], [b]) =>
                        Object.keys(STATUS_BAR_COLORS).indexOf(a) -
                        Object.keys(STATUS_BAR_COLORS).indexOf(b),
                    )
                    .map(([status, count]) => (
                      <div
                        key={status}
                        className={cn(
                          "h-full transition-all duration-300",
                          STATUS_BAR_COLORS[status] ?? "bg-slate-300",
                        )}
                        style={{ width: `${(count / d.total) * 100}%` }}
                        title={`${titleCase(status)}: ${count}`}
                      />
                    ))}
                </div>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(d.counts)
                  .filter(([, count]) => count > 0)
                  .map(([status, count]) => (
                    <span
                      key={status}
                      className="flex items-center gap-1 text-[10px] text-slate-500"
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          STATUS_BAR_COLORS[status] ?? "bg-slate-300",
                        )}
                      />
                      {titleCase(status)} ({count})
                    </span>
                  ))}
              </div>
            </div>

            {/* Manager + team KPI */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 border border-slate-100">
              <div>
                <p className="text-xs text-slate-500 font-medium">Manager</p>
                <p className="text-sm font-semibold text-slate-800">
                  {d.managerName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium">Team KPI</p>
                <p className="text-sm font-bold text-slate-900">{d.teamKpi}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Section 4: Individual Middle Row and Bottom Row Cards
   Splitting allows independent rendering & ordering.
   ═══════════════════════════════════════════════════════ */

/* Salesman Leaderboard Card */
export async function SalesmanLeaderboardSection({
  orgId,
  className,
}: {
  orgId?: number;
  className?: string;
}) {
  const salesmen = await getCachedAdminSalesmen();

  const rankedSalesmen = salesmen
    .map((s) => {
      const filteredClients = orgId
        ? s.assignedClients.filter((c) => c.org_id === orgId)
        : s.assignedClients;
      const counts = groupStatusCounts(filteredClients);
      const kpi = calculateKpiScore(counts);
      const company =
        s.salesmanManager?.[0]?.manager?.managerOrgs?.[0]?.org?.name ?? "—";
      return {
        id: s.id,
        name: s.name,
        kpi,
        clients: filteredClients.length,
        company,
      };
    })
    .sort((a, b) => b.kpi - a.kpi);

  const maxKpi = rankedSalesmen[0]?.kpi || 1;
  const rankIcons = ["🥇", "🥈", "🥉"];

  return (
    <Card className={cn("rounded-2xl h-[400px] flex flex-col", className)}>
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <Trophy size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-900">
          Salesman Leaderboard
        </h3>
      </div>
      <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
        {rankedSalesmen.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-3">
            <span className="w-6 text-center text-sm">
              {idx < 3 ? (
                rankIcons[idx]
              ) : (
                <span className="text-xs font-semibold text-slate-400">
                  #{idx + 1}
                </span>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {s.name}
                </p>
                <span className="text-xs font-bold text-slate-900 tabular-nums">
                  {s.kpi}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      idx === 0
                        ? "bg-amber-400"
                        : idx === 1
                          ? "bg-slate-400"
                          : idx === 2
                            ? "bg-amber-700"
                            : "bg-slate-300",
                    )}
                    style={{ width: `${Math.max((s.kpi / maxKpi) * 100, 4)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium shrink-0">
                  {s.company}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* Task Health Card */
export async function TaskHealthSection({
  orgId,
  className,
}: {
  orgId?: number;
  className?: string;
}) {
  const [tasks, clients] = await Promise.all([
    getCachedAdminTasks(),
    getCachedAdminClients(orgId),
  ]);

  const taskCounts: Record<string, number> = {};
  for (const t of tasks) {
    taskCounts[t.status] = (taskCounts[t.status] ?? 0) + 1;
  }
  const taskTotal = tasks.length || 1;

  const taskStatusColors: Record<string, string> = {
    pending: "bg-slate-400",
    in_process: "bg-cyan-400",
    achieved: "bg-emerald-400",
    unsuccessful: "bg-rose-400",
  };

  const clientCounts = groupStatusCounts(clients);
  const funnelStages = [
    { label: "Leads", count: clientCounts.lead ?? 0, color: "bg-amber-400" },
    {
      label: "Follow-ups",
      count: clientCounts.follow_up ?? 0,
      color: "bg-indigo-400",
    },
    {
      label: "Onboarded",
      count: clientCounts.onboarded ?? 0,
      color: "bg-emerald-400",
    },
  ];
  const funnelMax = funnelStages[0]?.count || 1;
  const overallConversion =
    funnelStages[0].count > 0
      ? Math.round((funnelStages[2].count / funnelStages[0].count) * 100)
      : 0;

  return (
    <Card className={cn("rounded-2xl h-[400px] flex flex-col", className)}>
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <ClipboardCheck size={16} className="text-violet-500" />
        <h3 className="text-sm font-semibold text-slate-900">Task Health</h3>
      </div>

      <div className="overflow-y-auto flex-1 pr-1">
        {/* Task status counts */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {Object.entries(taskStatusColors).map(([status, color]) => (
            <div
              key={status}
              className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2"
            >
              <span
                className={cn("h-2.5 w-2.5 rounded-full shrink-0", color)}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">
                  {titleCase(status)}
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {taskCounts[status] ?? 0}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Stacked bar */}
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 mb-6">
          {Object.entries(taskStatusColors).map(([status, color]) => (
            <div
              key={status}
              className={cn("h-full transition-all duration-300", color)}
              style={{
                width: `${((taskCounts[status] ?? 0) / taskTotal) * 100}%`,
              }}
              title={`${titleCase(status)}: ${taskCounts[status] ?? 0}`}
            />
          ))}
        </div>

        {/* Conversion Funnel */}
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-amber-500" />
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Conversion Funnel
          </h4>
          <span className="ml-auto text-xs font-bold text-emerald-600">
            {overallConversion}%
          </span>
        </div>
        <div className="space-y-2">
          {funnelStages.map((stage, idx) => (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-slate-600">
                  {stage.label}
                </span>
                <span className="text-[11px] font-bold text-slate-800">
                  {stage.count}
                </span>
              </div>
              <div className="h-5 rounded-md overflow-hidden bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-md transition-all duration-500 flex items-center justify-end pr-1.5",
                    stage.color,
                  )}
                  style={{
                    width: `${Math.max((stage.count / funnelMax) * 100, 8)}%`,
                  }}
                >
                  {idx < funnelStages.length - 1 && stage.count > 0 && (
                    <ArrowRight size={10} className="text-white/70" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* Live Activity Card */
export async function LiveActivitySection({
  className,
}: {
  className?: string;
}) {
  const activityFeed = await getCachedAdminActivityFeed();

  return (
    <Card className={cn("rounded-2xl h-[340px] flex flex-col", className)}>
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <Clock size={16} className="text-blue-500" />
        <h3 className="text-sm font-semibold text-slate-900">Live Activity</h3>
      </div>
      <div className="space-y-0 divide-y divide-slate-100 overflow-y-auto flex-1 pr-1">
        {activityFeed.map((log) => {
          const timeAgo = getTimeAgo(log.created_at);
          return (
            <div
              key={log.id}
              className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="mt-0.5 h-7 w-7 shrink-0 flex items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                {log.author.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-700 leading-relaxed">
                  <span className="font-semibold text-slate-900">
                    {log.author.name}
                  </span>{" "}
                  {log.action}
                  {log.client.name && (
                    <>
                      {" "}
                      for{" "}
                      <span className="font-semibold text-slate-900">
                        {log.client.name}
                      </span>
                    </>
                  )}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo}</p>
              </div>
            </div>
          );
        })}
        {activityFeed.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">
            No recent activity
          </p>
        )}
      </div>
    </Card>
  );
}

/* Lost Clients Table Card */
export async function LostClientsSection({
  period,
  orgId,
  className,
}: {
  period: PeriodKey;
  orgId?: number;
  className?: string;
}) {
  const { start, end } = getPeriodRange(period);
  const lostLogs = await getCachedAdminLogsByAction(
    "lost",
    start.toISOString(),
    end?.toISOString(),
  );

  const filteredLost = orgId
    ? lostLogs.filter((l) => l.client.org_id === orgId)
    : lostLogs;

  return (
    <Card
      className={cn(
        "rounded-2xl overflow-hidden p-0 h-[340px] flex flex-col",
        className,
      )}
    >
      <div className="px-5 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-500" />
          <h3 className="text-sm font-semibold text-slate-900">Lost Clients</h3>
          <span className="ml-auto text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
            {filteredLost.length}
          </span>
        </div>
      </div>
      <div className="overflow-auto flex-1">
        {filteredLost.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 tracking-wider sticky top-0 z-10 bg-white">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Client</th>
                <th className="px-5 py-2.5 font-semibold">Company</th>
                <th className="px-5 py-2.5 font-semibold">Salesman</th>
                <th className="px-5 py-2.5 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLost.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-slate-800">
                    {log.client.name}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {log.client.organization.name}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {log.author.name}
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">
                    {formatDate(log.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-slate-400 text-center py-10">
            No lost clients this period 🎉
          </p>
        )}
      </div>
    </Card>
  );
}

/* Monthly Onboarding Trend Card */
export async function MonthlyTrendSection({
  orgId,
  className,
}: {
  orgId?: number;
  className?: string;
}) {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [trendRaw, orgs] = await Promise.all([
    getCachedAdminTrendData(sixMonthsAgo.toISOString()),
    getCachedAdminOrgs(),
  ]);

  const orgA = orgs[0];
  const orgB = orgs[1];
  const monthBuckets = new Map<
    string,
    { companyA: number; companyB: number }
  >();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en", { month: "short", year: "2-digit" });
    monthBuckets.set(key, { companyA: 0, companyB: 0 });
  }
  for (const row of trendRaw) {
    const d = new Date(row.created_at);
    const key = d.toLocaleDateString("en", { month: "short", year: "2-digit" });
    const bucket = monthBuckets.get(key);
    if (!bucket) continue;
    if (orgA && row.client.org_id === orgA.id) bucket.companyA++;
    else if (orgB && row.client.org_id === orgB.id) bucket.companyB++;
  }
  const trendData = Array.from(monthBuckets.entries()).map(([month, data]) => ({
    month,
    ...data,
  }));

  return (
    <Card className={cn("rounded-2xl h-[400px] flex flex-col", className)}>
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <BarChart3 size={16} className="text-teal-500" />
        <h3 className="text-sm font-semibold text-slate-900">
          Monthly Onboarding Trend
        </h3>
      </div>
      <div className="flex-1 min-h-0">
        <MonthlyTrendChartWrapper
          data={trendData}
          companyAName={orgA?.name ?? "Company A"}
          companyBName={orgB?.name ?? "Company B"}
        />
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════
   Skeleton Fallbacks
   ═══════════════════════════════════════════════════════ */



export function KpiSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-5 border-t-[3px] border-t-slate-200 space-y-3"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
        >
          <div className="flex justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((j) => (
              <Skeleton key={j} className="h-16 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-3 rounded-full" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function MiddleSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3"
        >
          <Skeleton className="h-4 w-36" />
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1.5 w-3/4 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function BottomSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <Skeleton className="h-4 w-44 mb-4" />
        <Skeleton className="h-[260px] rounded-xl" />
      </div>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("rounded-2xl h-[400px] p-5 space-y-4", className)}>
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-3 rounded-full" />
      <Skeleton className="h-full rounded-xl" />
    </Card>
  );
}

export function CardSmallSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("rounded-2xl h-[340px] p-5 space-y-4", className)}>
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-3 rounded-full" />
      <Skeleton className="h-full rounded-xl" />
    </Card>
  );
}

/* ─── Utility ─── */
function getTimeAgo(date: Date | string) {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date);
}
