import {
  getCachedManagerSalesmen,
  getCachedManagerOrg,
  getCachedManagerLogs,
  getCachedManagerTasks,
  getCachedManagerActivityFeed,
  getMonthlyOrderStats,
} from "@/lib/cached-queries";
import { orderStatsScope } from "@/lib/scoping";
import { calculateKpiScore, groupStatusCounts } from "@/lib/kpi";
import { OrderMonthlyChart } from "@/components/orders/OrderMonthlyChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { cn, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Users,
  BarChart3,
  Clock,
  UserCheck,
  XCircle,
  Target,
  RefreshCw,
  Check,
  X,
} from "lucide-react";

/* ─── Utility: relative time ─── */
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

/* ─── Utility: count actions from logs ─── */
function countByAction(logs: { action: string }[], keyword: string) {
  return logs.filter((l) => l.action.toLowerCase().includes(keyword)).length;
}

/* ─── Utility: get date ranges ─── */
function getMonthRange(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end =
    offset < 0
      ? new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999)
      : undefined;
  return { start, end };
}

/* ─── Utility: week start ─── */
function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.getFullYear(), now.getMonth(), diff);
}

/* ─── Utility: build salesman data with KPI ─── */
type SalesmanRaw = {
  id: number;
  name: string;
  assignedClients: { id: number; status: string }[];
};

type SalesmanWithKpi = {
  id: number;
  name: string;
  clients: { id: number; status: string }[];
  counts: Record<string, number>;
  kpiScore: number;
  totalClients: number;
};

function buildSalesmenWithKpi(salesmen: SalesmanRaw[]): SalesmanWithKpi[] {
  return salesmen
    .map((s) => {
      const counts = groupStatusCounts(s.assignedClients);
      const kpiScore = calculateKpiScore(counts);
      return {
        id: s.id,
        name: s.name,
        clients: s.assignedClients,
        counts,
        kpiScore,
        totalClients: s.assignedClients.length,
      };
    })
    .sort((a, b) => b.kpiScore - a.kpiScore);
}

/* ─── Utility: avatar initials ─── */
const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-pink-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ═══════════════════════════════════════════════════════
   Section 2: KPI Summary Cards (4 cards)
   ═══════════════════════════════════════════════════════ */

export async function ManagerKpiCardsRow({
  managerId,
  period,
}: {
  managerId: number;
  period: "this_month" | "last_month";
}) {
  const salesmen = await getCachedManagerSalesmen(managerId);
  const salesmanIds = salesmen.map((s) => s.id);

  const thisMonth = getMonthRange(0);
  const lastMonth = getMonthRange(-1);

  const [thisMonthLogs, lastMonthLogs, tasks] = await Promise.all([
    getCachedManagerLogs(salesmanIds, thisMonth.start.toISOString()),
    getCachedManagerLogs(
      salesmanIds,
      lastMonth.start.toISOString(),
      lastMonth.end!.toISOString()
    ),
    getCachedManagerTasks(salesmanIds),
  ]);

  const currentLogs = period === "last_month" ? lastMonthLogs : thisMonthLogs;
  const prevLogs = period === "last_month" ? [] : lastMonthLogs;

  // Team-wide client counts
  const allClients = salesmen.flatMap((s) => s.assignedClients);
  const allCounts = groupStatusCounts(allClients);

  // KPI cards data
  const onboardedThis = countByAction(currentLogs, "onboarded");
  const onboardedPrev = countByAction(prevLogs, "onboarded");
  const onboardedPct =
    onboardedPrev > 0
      ? Math.round(((onboardedThis - onboardedPrev) / onboardedPrev) * 100)
      : onboardedThis > 0
        ? 100
        : 0;

  const followUpCount = allCounts.follow_up ?? 0;
  const newLeadCount = allCounts.lead ?? 0;
  const activePipeline = followUpCount + newLeadCount;

  // New additions this week
  const weekStart = getWeekStart();
  const weekLogs = currentLogs.filter(
    (l) => new Date(l.created_at) >= weekStart
  );
  const weekNew =
    countByAction(weekLogs, "lead") + countByAction(weekLogs, "follow_up");

  // Team KPI average
  const sortedSalesmen = buildSalesmenWithKpi(salesmen);
  const avgKpi =
    sortedSalesmen.length > 0
      ? Math.round(
          sortedSalesmen.reduce((sum, s) => sum + s.kpiScore, 0) /
            sortedSalesmen.length
        )
      : 0;

  // Previous month average KPI — derive from log-based delta
  const prevOnboarded = countByAction(prevLogs, "onboarded");
  const kpiChange = onboardedThis - prevOnboarded;
  const kpiChangePct =
    prevOnboarded > 0
      ? Math.round((kpiChange / prevOnboarded) * 100)
      : kpiChange > 0
        ? 100
        : 0;

  // Overdue tasks
  const now = new Date();
  const overdueTasks = tasks.filter(
    (t) =>
      new Date(t.due_date) < now &&
      ["pending", "in_process"].includes(t.status)
  );

  const cards = [
    {
      label: "Team Onboarded",
      value: onboardedThis,
      badgeLabel: `${onboardedPct > 0 ? "+" : ""}${onboardedPct}% vs last month`,
      direction: onboardedPct > 0 ? "up" : onboardedPct < 0 ? "down" : "flat",
      Icon: UserCheck,
      bg: "bg-teal-600",
    },
    {
      label: "Active Pipeline",
      value: activePipeline,
      badgeLabel: `+${weekNew} this week`,
      direction: weekNew > 0 ? "up" : "flat",
      Icon: Users,
      bg: "bg-blue-600",
    },
    {
      label: "Team KPI Score",
      value: avgKpi,
      badgeLabel: `${kpiChangePct > 0 ? "+" : ""}${kpiChangePct}% change`,
      direction: kpiChangePct > 0 ? "up" : kpiChangePct < 0 ? "down" : "flat",
      Icon: BarChart3,
      bg: "bg-violet-600",
    },
    {
      label: "Overdue Tasks",
      value: overdueTasks.length,
      badgeLabel: `${overdueTasks.length} pending`,
      direction: overdueTasks.length > 0 ? "up" : "flat",
      Icon: XCircle,
      bg: "bg-slate-800",
    },
  ] as const;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <StatCard
          key={card.label}
          icon={card.Icon}
          label={card.label}
          value={card.value}
          badgeLabel={card.badgeLabel}
          badgeDirection={card.direction}
          theme={{ bg: card.bg }}
        />
      ))}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   Section 3: Salesman Performance (Spotlight + Leaderboard)
   ═══════════════════════════════════════════════════════ */

export async function SalesmanPerformanceSection({
  managerId,
}: {
  managerId: number;
}) {
  const [salesmen, orgData] = await Promise.all([
    getCachedManagerSalesmen(managerId),
    getCachedManagerOrg(managerId),
  ]);

  const salesmanIds = salesmen.map((s) => s.id);
  const [tasks, activityFeed] = await Promise.all([
    getCachedManagerTasks(salesmanIds),
    getCachedManagerActivityFeed(salesmanIds),
  ]);

  const sortedSalesmen = buildSalesmenWithKpi(salesmen);
  const orgName = orgData[0]?.name ?? "—";
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  if (sortedSalesmen.length === 0) {
    return (
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Salesman Performance
          </h2>
          <p className="text-xs text-slate-500">this month</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-10 text-center">
          <p className="text-sm text-slate-500">
            No salesmen assigned to your team yet.
          </p>
        </div>
      </div>
    );
  }

  const topSalesman = sortedSalesmen[0];
  const maxKpi = topSalesman.kpiScore || 1;

  // Last active per salesman from activity feed
  const lastActiveMap = new Map<number, Date>();
  for (const log of activityFeed) {
    if (!lastActiveMap.has(log.author.id)) {
      lastActiveMap.set(log.author.id, new Date(log.created_at));
    }
  }

  // Task stats per salesman
  const taskStatsMap = new Map<
    number,
    { total: number; completed: number }
  >();
  for (const t of tasks) {
    const current = taskStatsMap.get(t.assignedTo.id) ?? {
      total: 0,
      completed: 0,
    };
    current.total++;
    if (t.status === "achieved") current.completed++;
    taskStatsMap.set(t.assignedTo.id, current);
  }

  const topStats = taskStatsMap.get(topSalesman.id) ?? {
    total: 0,
    completed: 0,
  };
  const topLastActive = lastActiveMap.get(topSalesman.id);

  // Progress bar max (for normalization)
  const topOnboarded = topSalesman.counts.onboarded ?? 0;
  const topFollowUp = topSalesman.counts.follow_up ?? 0;
  const topNewLead = topSalesman.counts.lead ?? 0;
  const progressMax = Math.max(topOnboarded, topFollowUp, topNewLead, 1);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Salesman Performance
        </h2>
        <p className="text-xs text-slate-500">this month</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
        {/* ── LEFT: Top Performer Spotlight ── */}
        <div className="relative h-full flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          <span className="absolute inset-x-0 top-0 h-[3px] bg-emerald-500" aria-hidden />

          <div className="p-4 pt-5 flex flex-col flex-1">
            {/* Top badge */}
            <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wide mb-3">
              <Trophy size={11} strokeWidth={2.5} />
              Top Performer
            </span>

            {/* Avatar + Name + Score */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className={cn(
                  "h-11 w-11 shrink-0 flex items-center justify-center rounded-full text-white text-sm font-bold ring-2 ring-emerald-500/40",
                  getAvatarColor(topSalesman.name)
                )}
              >
                {getInitials(topSalesman.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {topSalesman.name}
                </p>
                <p className="text-xs text-slate-400 truncate">Salesman · {orgName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-2xl font-bold leading-none text-emerald-400 tabular-nums">
                  {topSalesman.kpiScore}
                </p>
                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider mt-1">
                  KPI Score
                </p>
              </div>
            </div>

            {/* 4 stat boxes */}
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              <div className="rounded-lg border border-white/5 bg-white/[0.04] px-1.5 py-1.5 text-center">
                <p className="font-display text-sm font-bold text-emerald-400">
                  {topOnboarded}
                </p>
                <p className="text-[8px] font-semibold text-slate-500 uppercase">
                  Onboarded
                </p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.04] px-1.5 py-1.5 text-center">
                <p className="font-display text-sm font-bold text-violet-400">
                  {topFollowUp}
                </p>
                <p className="text-[8px] font-semibold text-slate-500 uppercase">
                  Follow-up
                </p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.04] px-1.5 py-1.5 text-center">
                <p className="font-display text-sm font-bold text-amber-400">
                  {topNewLead}
                </p>
                <p className="text-[8px] font-semibold text-slate-500 uppercase">
                  New Lead
                </p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.04] px-1.5 py-1.5 text-center">
                <p className="font-display text-sm font-bold text-rose-400">
                  {topSalesman.counts.lost ?? 0}
                </p>
                <p className="text-[8px] font-semibold text-slate-500 uppercase">
                  Lost
                </p>
              </div>
            </div>

            {/* 3 progress bars */}
            <div className="space-y-2 mb-4">
              {[
                {
                  label: "Onboarded",
                  value: topOnboarded,
                  color: "bg-emerald-500",
                },
                {
                  label: "Follow-up",
                  value: topFollowUp,
                  color: "bg-violet-500",
                },
                {
                  label: "New Lead",
                  value: topNewLead,
                  color: "bg-amber-500",
                },
              ].map((bar) => (
                <div key={bar.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-400">
                      {bar.label}
                    </span>
                    <span className="text-[11px] font-bold text-white">
                      {bar.value}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        bar.color
                      )}
                      style={{
                        width: `${Math.max(
                          (bar.value / progressMax) * 100,
                          bar.value > 0 ? 8 : 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-auto flex items-center justify-between border-t border-slate-800 pt-3">
              <div>
                <p className="text-[9px] text-slate-500 font-medium uppercase">
                  Tasks Completed
                </p>
                <p className="text-xs font-semibold text-slate-200">
                  {topStats.completed}/{topStats.total}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-500 font-medium uppercase">
                  Last Active
                </p>
                <p className="text-xs font-semibold text-slate-200">
                  {topLastActive ? getTimeAgo(topLastActive) : "No activity"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Team Leaderboard ── */}
        <div className="h-full flex flex-col rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-white">
                Team Leaderboard
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              all salesmen ranked by KPI score
            </p>
          </div>

          <div className="space-y-0 divide-y divide-slate-800 overflow-y-auto flex-1 min-h-0 max-h-[420px] pr-1">
            {sortedSalesmen.map((s, idx) => {
              const lastActive = lastActiveMap.get(s.id);
              const isActive24h =
                lastActive && lastActive >= twentyFourHoursAgo;
              const statusDotColor = isActive24h
                ? "bg-emerald-500"
                : s.kpiScore < 60
                  ? "bg-amber-500"
                  : "bg-slate-600";

              const barColor =
                s.kpiScore >= 75
                  ? "bg-emerald-500"
                  : s.kpiScore >= 50
                    ? "bg-amber-500"
                    : "bg-rose-500";
              const scoreColor =
                s.kpiScore >= 75
                  ? "text-emerald-400"
                  : s.kpiScore >= 50
                    ? "text-amber-400"
                    : "text-rose-400";

              const rankIcon =
                idx === 0 ? "🥇" : idx === 1 ? "🥈" : null;

              return (
                <div
                  key={s.id}
                  className="flex items-center gap-2 py-2 first:pt-0 last:pb-0"
                >
                  {/* Rank */}
                  <span className="w-5 text-center text-xs shrink-0">
                    {rankIcon ? (
                      rankIcon
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500">
                        #{idx + 1}
                      </span>
                    )}
                  </span>

                  {/* Avatar with status dot */}
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        "h-7 w-7 flex items-center justify-center rounded-full text-white text-[10px] font-bold",
                        getAvatarColor(s.name)
                      )}
                    >
                      {getInitials(s.name)}
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-slate-950",
                        statusDotColor
                      )}
                    />
                  </div>

                  {/* Name + last active */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {s.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {lastActive ? getTimeAgo(lastActive) : "No activity"}
                    </p>
                  </div>

                  {/* Mini stats */}
                  <div className="hidden sm:flex items-center gap-2.5 shrink-0">
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-300 tabular-nums">
                        {s.totalClients}
                      </p>
                      <p className="text-[7px] font-semibold text-slate-500 uppercase">
                        CLIENTS
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-emerald-400 tabular-nums">
                        {s.counts.onboarded ?? 0}
                      </p>
                      <p className="text-[7px] font-semibold text-slate-500 uppercase">
                        ON
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-rose-400 tabular-nums">
                        {s.counts.lost ?? 0}
                      </p>
                      <p className="text-[7px] font-semibold text-slate-500 uppercase">
                        LOST
                      </p>
                    </div>
                  </div>

                  {/* Score bar + score */}
                  <div className="w-16 shrink-0">
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mb-1">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          barColor
                        )}
                        style={{
                          width: `${Math.max(
                            (s.kpiScore / maxKpi) * 100,
                            4
                          )}%`,
                        }}
                      />
                    </div>
                    <p
                      className={cn(
                        "text-[11px] font-bold text-right tabular-nums",
                        scoreColor
                      )}
                    >
                      {s.kpiScore}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   Section 4: Conversion Funnel + Pending Tasks
   ═══════════════════════════════════════════════════════ */

export async function FunnelAndTasksSection({
  managerId,
}: {
  managerId: number;
}) {
  const salesmen = await getCachedManagerSalesmen(managerId);
  const salesmanIds = salesmen.map((s) => s.id);
  const tasks = await getCachedManagerTasks(salesmanIds);

  const allClients = salesmen.flatMap((s) => s.assignedClients);
  const allCounts = groupStatusCounts(allClients);

  const newLeads = allCounts.lead ?? 0;
  const followUp = allCounts.follow_up ?? 0;
  const onboarded = allCounts.onboarded ?? 0;
  const conversionRate =
    newLeads > 0 ? Math.round((onboarded / newLeads) * 100) : 0;
  const followUpPct =
    newLeads > 0 ? Math.round((followUp / newLeads) * 100) : 0;
  const onboardedPct =
    newLeads > 0 ? Math.round((onboarded / newLeads) * 100) : 0;

  // Pending tasks
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);

  const pendingTasks = tasks
    .filter((t) => ["pending", "in_process"].includes(t.status))
    .sort(
      (a, b) =>
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

  function getDueLabel(dueDate: Date | string) {
    const due = new Date(dueDate);
    const dueDay = new Date(
      due.getFullYear(),
      due.getMonth(),
      due.getDate()
    );
    const diffDays = Math.round(
      (dueDay.getTime() - today.getTime()) / 86400000
    );

    if (diffDays < 0) {
      return {
        label: `Overdue ${Math.abs(diffDays)}d`,
        color: "text-red-600",
        dotColor: "bg-red-500",
      };
    }
    if (diffDays === 0) {
      return {
        label: "Due today",
        color: "text-amber-600",
        dotColor: "bg-amber-500",
      };
    }
    if (diffDays === 1) {
      return {
        label: "Due tomorrow",
        color: "text-slate-300",
        dotColor: "bg-indigo-500",
      };
    }
    return {
      label: `Due in ${diffDays}d`,
      color: "text-slate-300",
      dotColor: "bg-indigo-500",
    };
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ── LEFT: Conversion Funnel ── */}
      <SectionCard title="Team Conversion Funnel" subtitle="this month">
        <div className="space-y-4">
          {/* Funnel bars */}
          {[
            {
              label: "New Leads",
              count: newLeads,
              pct: 100,
              color: "bg-indigo-500",
            },
            {
              label: "Follow-up",
              count: followUp,
              pct: followUpPct,
              color: "bg-violet-500",
            },
            {
              label: "Onboarded",
              count: onboarded,
              pct: onboardedPct,
              color: "bg-emerald-500",
            },
          ].map((bar) => (
            <div key={bar.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-slate-600">
                  {bar.label}
                </span>
                <span className="text-[11px] font-bold text-slate-800">
                  {bar.count}
                </span>
              </div>
              <div className="h-8 rounded-lg overflow-hidden bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-lg transition-all duration-500 flex items-center px-3",
                    bar.color
                  )}
                  style={{
                    width: `${Math.max(bar.pct, bar.count > 0 ? 12 : 0)}%`,
                  }}
                >
                  {bar.count > 0 && (
                    <span className="text-xs font-bold text-white">
                      {bar.count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Divider + conversion rate */}
          <div className="border-t border-slate-100 pt-4 text-center">
            <p className="text-3xl font-bold text-emerald-600 tabular-nums">
              {conversionRate}%
            </p>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-1">
              Team Conversion Rate
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ── RIGHT: Pending Tasks ── */}
      <SectionCard
        title="Pending Tasks"
        subtitle="by salesman"
        className="h-auto lg:h-[420px] flex flex-col"
        bodyClassName="flex-1 min-h-0"
      >
        <div className="space-y-0 divide-y divide-slate-100 overflow-y-auto h-full pr-1">
          {pendingTasks.length > 0 ? (
            pendingTasks.map((task) => {
              const due = getDueLabel(task.due_date);
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full shrink-0",
                      due.dotColor
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">
                      {task.description}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {task.assignedTo.name?.split(" ")[0] ?? "Unassigned"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-bold shrink-0",
                      due.color
                    )}
                  >
                    {due.label}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">
              No pending tasks 🎉
            </p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   Section 5: Team Activity Feed
   ═══════════════════════════════════════════════════════ */

const ACTION_ICON_MAP: Record<
  string,
  { bg: string; Icon: typeof Check }
> = {
  onboarded: { bg: "bg-emerald-500", Icon: Check },
  follow_up: { bg: "bg-blue-500", Icon: RefreshCw },
  lead: { bg: "bg-amber-500", Icon: Target },
  lost: { bg: "bg-red-500", Icon: X },
};

function getActionIcon(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("onboarded")) return ACTION_ICON_MAP.onboarded;
  if (lower.includes("follow")) return ACTION_ICON_MAP.follow_up;
  if (lower.includes("lead") || lower.includes("new"))
    return ACTION_ICON_MAP.lead;
  if (lower.includes("lost") || lower.includes("cancel"))
    return ACTION_ICON_MAP.lost;
  return { bg: "bg-slate-400", Icon: Clock };
}

export async function ManagerActivityFeed({
  managerId,
}: {
  managerId: number;
}) {
  const salesmen = await getCachedManagerSalesmen(managerId);
  const salesmanIds = salesmen.map((s) => s.id);
  const activityFeed = await getCachedManagerActivityFeed(salesmanIds);

  return (
    <SectionCard title="Team Activity" subtitle="live feed" icon={Clock} iconClassName="text-blue-500">
      <div className="space-y-0 divide-y divide-slate-100">
        {activityFeed.length > 0 ? (
          activityFeed.map((log) => {
            const iconData = getActionIcon(log.action);
            const Icon = iconData.Icon;
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div
                  className={cn(
                    "h-7 w-7 shrink-0 flex items-center justify-center rounded-lg text-white",
                    iconData.bg
                  )}
                >
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold text-slate-900">
                      {log.author.name.split(" ")[0]}
                    </span>{" "}
                    <span className="text-slate-500">{log.action}</span>
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
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {getTimeAgo(log.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-slate-400 text-center py-6">
            No recent activity
          </p>
        )}
      </div>
    </SectionCard>
  );
}


const ORDER_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function ManagerOrderStatsSection({ managerId }: { managerId: number }) {
  const scope = await orderStatsScope({ id: managerId, role_id: 2 });
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
    <SectionCard title="Team orders: collected vs pending">
      <OrderMonthlyChart data={chartData} />
    </SectionCard>
  );
}

/* ═══════════════════════════════════════════════════════
   Skeleton Fallbacks
   ═══════════════════════════════════════════════════════ */

export function ManagerKpiSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-3xl border border-slate-200 bg-white p-5 animate-pulse">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <div className="mt-5 flex items-end justify-between gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ManagerPerfSkeleton() {
  const dark = "animate-pulse rounded-lg bg-slate-800";
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div className={cn(dark, "h-4 w-24 rounded-full")} />
          <div className="flex items-center gap-3">
            <div className={cn(dark, "h-11 w-11 rounded-full shrink-0")} />
            <div className="flex-1 space-y-2">
              <div className={cn(dark, "h-3.5 w-28")} />
              <div className={cn(dark, "h-3 w-20")} />
            </div>
            <div className={cn(dark, "h-8 w-12")} />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className={cn(dark, "h-11 rounded-lg")} />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className={cn(dark, "h-1.5 rounded-full")} />
          ))}
          <div className={cn(dark, "h-10 rounded-lg")} />
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div className={cn(dark, "h-4 w-32")} />
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="flex items-center gap-2.5">
              <div className={cn(dark, "h-7 w-7 rounded-full shrink-0")} />
              <div className="flex-1 space-y-1.5">
                <div className={cn(dark, "h-3 w-full")} />
                <div className={cn(dark, "h-1.5 w-3/4 rounded-full")} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ManagerFunnelTasksSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 3 }).map((_, j) => (
          <div key={j} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-10 w-16 mx-auto" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <Skeleton className="h-5 w-28" />
        {Array.from({ length: 5 }).map((_, j) => (
          <div key={j} className="flex items-center gap-3">
            <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-20" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ManagerActivitySkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <Skeleton className="h-5 w-28" />
      {Array.from({ length: 5 }).map((_, j) => (
        <div key={j} className="flex items-start gap-3">
          <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ManagerOrderStatsSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-[280px] w-full rounded-xl" />
    </div>
  );
}
