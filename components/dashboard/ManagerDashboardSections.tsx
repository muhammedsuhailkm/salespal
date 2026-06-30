import {
  getCachedManagerSalesmen,
  getCachedManagerOrg,
  getCachedManagerLogs,
  getCachedManagerTasks,
  getCachedManagerActivityFeed,
} from "@/lib/cached-queries";
import { calculateKpiScore, groupStatusCounts } from "@/lib/kpi";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
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
      badge: `${onboardedPct > 0 ? "+" : ""}${onboardedPct}% vs last month`,
      badgeColor: "text-emerald-700 border-emerald-100/50",
      bgColor: "bg-emerald-50/60 border-emerald-100",
      borderColor: "border-t-emerald-500",
      iconBg: "bg-white border border-emerald-100/50 shadow-sm",
      iconColor: "text-emerald-700",
      Icon: UserCheck,
      pctValue: onboardedPct,
    },
    {
      label: "Active Pipeline",
      value: activePipeline,
      badge: `+${weekNew} this week`,
      badgeColor: "text-blue-700 border-blue-100/50",
      bgColor: "bg-blue-50/60 border-blue-100",
      borderColor: "border-t-blue-500",
      iconBg: "bg-white border border-blue-100/50 shadow-sm",
      iconColor: "text-blue-700",
      Icon: Users,
      pctValue: weekNew,
    },
    {
      label: "Team KPI Score",
      value: avgKpi,
      badge: `${kpiChangePct > 0 ? "+" : ""}${kpiChangePct}% change`,
      badgeColor: "text-violet-700 border-violet-100/50",
      bgColor: "bg-violet-50/60 border-violet-100",
      borderColor: "border-t-violet-500",
      iconBg: "bg-white border border-violet-100/50 shadow-sm",
      iconColor: "text-violet-700",
      Icon: BarChart3,
      pctValue: kpiChangePct,
    },
    {
      label: "Overdue Tasks",
      value: overdueTasks.length,
      badge: `${overdueTasks.length} pending`,
      badgeColor: "text-red-700 border-red-100/50",
      bgColor: "bg-red-50/60 border-red-100",
      borderColor: "border-t-red-500",
      iconBg: "bg-white border border-red-100/50 shadow-sm",
      iconColor: "text-red-700",
      Icon: XCircle,
      pctValue: overdueTasks.length > 0 ? overdueTasks.length : 0,
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.Icon;
        return (
          <div
            key={card.label}
            className={`rounded-2xl border ${card.bgColor} p-5 shadow-sm border-t-[3px] ${card.borderColor} transition-all duration-200 hover:shadow-md`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`h-9 w-9 flex items-center justify-center rounded-xl ${card.iconBg}`}
              >
                <Icon size={18} className={card.iconColor} />
              </div>
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold bg-white shadow-sm border ${card.badgeColor}`}
              >
                {card.pctValue > 0 ? (
                  <TrendingUp size={10} />
                ) : card.pctValue < 0 ? (
                  <TrendingDown size={10} />
                ) : (
                  <Minus size={10} />
                )}
                {card.badge}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 leading-none">
              {card.value}
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
        <Card className="rounded-2xl p-10 text-center">
          <p className="text-sm text-slate-400">
            No salesmen assigned to your team yet.
          </p>
        </Card>
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

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── LEFT: Top Performer Spotlight ── */}
        <Card className="rounded-2xl p-0 overflow-hidden">
          {/* Green gradient top border */}
          <div className="h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />

          <div className="p-5">
            {/* Top badge */}
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-4">
              🏆 Top Performer
            </span>

            {/* Avatar + Name + Score */}
            <div className="flex items-center gap-4 mb-5">
              <div
                className={cn(
                  "h-[54px] w-[54px] shrink-0 flex items-center justify-center rounded-full text-white text-lg font-bold ring-[3px] ring-emerald-400",
                  getAvatarColor(topSalesman.name)
                )}
              >
                {getInitials(topSalesman.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-slate-900 truncate">
                  {topSalesman.name}
                </p>
                <p className="text-xs text-slate-500">Salesman · {orgName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[32px] font-bold leading-none text-slate-900 tabular-nums">
                  {topSalesman.kpiScore}
                </p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">
                  KPI Score
                </p>
              </div>
            </div>

            {/* 4 stat boxes */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              <div className="rounded-xl bg-emerald-50/70 px-2 py-2 text-center">
                <p className="text-base font-bold text-emerald-700">
                  {topOnboarded}
                </p>
                <p className="text-[9px] font-semibold text-emerald-600 uppercase">
                  Onboarded
                </p>
              </div>
              <div className="rounded-xl bg-indigo-50/70 px-2 py-2 text-center">
                <p className="text-base font-bold text-indigo-700">
                  {topFollowUp}
                </p>
                <p className="text-[9px] font-semibold text-indigo-600 uppercase">
                  Follow-up
                </p>
              </div>
              <div className="rounded-xl bg-amber-50/70 px-2 py-2 text-center">
                <p className="text-base font-bold text-amber-700">
                  {topNewLead}
                </p>
                <p className="text-[9px] font-semibold text-amber-600 uppercase">
                  New Lead
                </p>
              </div>
              <div className="rounded-xl bg-red-50/70 px-2 py-2 text-center">
                <p className="text-base font-bold text-red-700">
                  {topSalesman.counts.lost ?? 0}
                </p>
                <p className="text-[9px] font-semibold text-red-600 uppercase">
                  Lost
                </p>
              </div>
            </div>

            {/* 3 progress bars */}
            <div className="space-y-2.5 mb-5">
              {[
                {
                  label: "Onboarded",
                  value: topOnboarded,
                  color: "bg-emerald-500",
                },
                {
                  label: "Follow-up",
                  value: topFollowUp,
                  color: "bg-indigo-500",
                },
                {
                  label: "New Lead",
                  value: topNewLead,
                  color: "bg-amber-500",
                },
              ].map((bar) => (
                <div key={bar.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      {bar.label}
                    </span>
                    <span className="text-[11px] font-bold text-slate-800">
                      {bar.value}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
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
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 border border-slate-100">
              <div>
                <p className="text-[10px] text-slate-400 font-medium uppercase">
                  Tasks Completed
                </p>
                <p className="text-xs font-semibold text-slate-700">
                  {topStats.completed}/{topStats.total}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-medium uppercase">
                  Last Active
                </p>
                <p className="text-xs font-semibold text-slate-700">
                  {topLastActive ? getTimeAgo(topLastActive) : "No activity"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* ── RIGHT: Team Leaderboard ── */}
        <Card className="rounded-2xl h-auto lg:h-[520px] flex flex-col">
          <div className="mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-900">
                Team Leaderboard
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              all salesmen ranked by KPI score
            </p>
          </div>

          <div className="space-y-0 divide-y divide-slate-100 overflow-y-auto flex-1 pr-1">
            {sortedSalesmen.map((s, idx) => {
              const lastActive = lastActiveMap.get(s.id);
              const isActive24h =
                lastActive && lastActive >= twentyFourHoursAgo;
              const statusDotColor = isActive24h
                ? "bg-emerald-500"
                : s.kpiScore < 60
                  ? "bg-amber-500"
                  : "bg-slate-300";

              const barColor =
                s.kpiScore >= 75
                  ? "bg-emerald-500"
                  : s.kpiScore >= 50
                    ? "bg-amber-500"
                    : "bg-red-500";
              const scoreColor =
                s.kpiScore >= 75
                  ? "text-emerald-700"
                  : s.kpiScore >= 50
                    ? "text-amber-700"
                    : "text-red-700";

              const rankIcon =
                idx === 0 ? "🥇" : idx === 1 ? "🥈" : null;

              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  {/* Rank */}
                  <span className="w-6 text-center text-sm shrink-0">
                    {rankIcon ? (
                      rankIcon
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        #{idx + 1}
                      </span>
                    )}
                  </span>

                  {/* Avatar with status dot */}
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        "h-8 w-8 flex items-center justify-center rounded-full text-white text-[11px] font-bold",
                        getAvatarColor(s.name)
                      )}
                    >
                      {getInitials(s.name)}
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white",
                        statusDotColor
                      )}
                    />
                  </div>

                  {/* Name + last active */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {s.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {lastActive ? getTimeAgo(lastActive) : "No activity"}
                    </p>
                  </div>

                  {/* Mini stats */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-700 tabular-nums">
                        {s.totalClients}
                      </p>
                      <p className="text-[8px] font-semibold text-slate-500 uppercase">
                        CLIENTS
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-emerald-700 tabular-nums">
                        {s.counts.onboarded ?? 0}
                      </p>
                      <p className="text-[8px] font-semibold text-emerald-600 uppercase">
                        ON
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-red-700 tabular-nums">
                        {s.counts.lost ?? 0}
                      </p>
                      <p className="text-[8px] font-semibold text-red-600 uppercase">
                        LOST
                      </p>
                    </div>
                  </div>

                  {/* Score bar + score */}
                  <div className="w-20 shrink-0">
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-1">
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
                        "text-xs font-bold text-right tabular-nums",
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
        </Card>
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
      <Card className="rounded-2xl">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Team Conversion Funnel
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">this month</p>
        </div>

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
      </Card>

      {/* ── RIGHT: Pending Tasks ── */}
      <Card className="rounded-2xl h-auto lg:h-[420px] flex flex-col">
        <div className="mb-4 shrink-0">
          <h3 className="text-sm font-semibold text-slate-900">
            Pending Tasks
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">by salesman</p>
        </div>

        <div className="space-y-0 divide-y divide-slate-100 overflow-y-auto flex-1 pr-1">
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
      </Card>
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
    <Card className="rounded-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={16} className="text-blue-500" />
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Team Activity
          </h3>
          <p className="text-[11px] text-slate-500">live feed</p>
        </div>
      </div>

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
    </Card>
  );
}


/* ═══════════════════════════════════════════════════════
   Skeleton Fallbacks
   ═══════════════════════════════════════════════════════ */

export function ManagerKpiSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-5 border-t-[3px] border-t-slate-200 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function ManagerPerfSkeleton() {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <Skeleton className="h-5 w-28 rounded-full" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-[54px] w-[54px] rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-10 w-14" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-14 rounded-xl" />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, j) => (
            <Skeleton key={j} className="h-2 rounded-full" />
          ))}
          <Skeleton className="h-12 rounded-xl" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1.5 w-3/4 rounded-full" />
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
