import Link from "next/link";
import { getCachedManagerOrg, getCachedManagerActivityFeed, getMonthlyOrderStats } from "@/lib/cached-queries";
import { getManagerKpiCards, getManagerPendingTasks, getManagerTaskStats, getManagerTeam, type TeamMember } from "@/lib/manager-dashboard";
import { orderStatsScope } from "@/lib/scoping";
import { OrderMonthlyChart } from "@/components/orders/OrderMonthlyChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatCardWithDetails, type StatDetailItem } from "@/components/dashboard/StatCardWithDetails";
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

/** Team totals summed over the per-salesman status counts. */
function teamCounts(team: TeamMember[]) {
  const totals: Record<string, number> = {};
  for (const m of team) for (const [k, v] of Object.entries(m.counts)) totals[k] = (totals[k] ?? 0) + v;
  return totals;
}

/* ─── Utility: avatar initials ─── */
const AVATAR_COLORS = [
  "bg-success",
  "bg-info",
  "bg-primary",
  "bg-warning",
  "bg-danger",
  "bg-primary",
  "bg-primary",
  "bg-danger",
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
  const sortedSalesmen = await getManagerTeam(managerId);
  const salesmanIds = sortedSalesmen.map((s) => s.id);

  const thisMonth = getMonthRange(0);
  const lastMonth = getMonthRange(-1);
  const current = period === "last_month" ? lastMonth : thisMonth;
  const k = await getManagerKpiCards(
    salesmanIds,
    current.start.toISOString(),
    current.end?.toISOString() ?? null,
    period === "last_month" ? null : lastMonth.start.toISOString(),
    period === "last_month" ? null : lastMonth.end!.toISOString(),
    getWeekStart().toISOString()
  );

  const allCounts = teamCounts(sortedSalesmen);
  const onboardedThis = k.onboardedThis;
  const onboardedPrev = k.onboardedPrev;
  const onboardedPct =
    onboardedPrev > 0
      ? Math.round(((onboardedThis - onboardedPrev) / onboardedPrev) * 100)
      : onboardedThis > 0
        ? 100
        : 0;

  const activePipeline = (allCounts.follow_up ?? 0) + (allCounts.lead ?? 0);
  const weekNew = k.weekNew;

  const avgKpi =
    sortedSalesmen.length > 0
      ? Math.round(sortedSalesmen.reduce((sum, s) => sum + s.kpiScore, 0) / sortedSalesmen.length)
      : 0;

  // KPI change — derived from the onboarded log delta (unchanged rule)
  const kpiChange = onboardedThis - onboardedPrev;
  const kpiChangePct = onboardedPrev > 0 ? Math.round((kpiChange / onboardedPrev) * 100) : kpiChange > 0 ? 100 : 0;
  const overdueCount = k.overdueTotal;
  const more = (total: number, shown: number) => (total > shown ? ` (showing ${shown} of ${total})` : "");

  const cards: {
    label: string;
    value: number;
    badgeLabel: string;
    direction: "up" | "down" | "flat";
    Icon: typeof UserCheck;
    bg: string;
    items: StatDetailItem[];
    emptyMessage: string;
    viewAllHref: string;
    viewAllLabel: string;
  }[] = [
    {
      label: "Team Onboarded",
      value: onboardedThis,
      badgeLabel: `${onboardedPct > 0 ? "+" : ""}${onboardedPct}% vs last month`,
      direction: onboardedPct > 0 ? "up" : onboardedPct < 0 ? "down" : "flat",
      Icon: UserCheck,
      bg: "bg-primary",
      items: k.onboardedLogs.map((l) => ({
        id: l.id,
        primary: l.client?.name ?? "Client",
        secondary: `by ${l.author?.name ?? "—"}`,
        meta: formatDate(l.created_at),
      })),
      emptyMessage: "No clients onboarded in this period.",
      viewAllHref: "/dashboard/manager/clients",
      viewAllLabel: "Go to clients",
    },
    {
      label: "Active Pipeline",
      value: activePipeline,
      badgeLabel: `+${weekNew} this week`,
      direction: weekNew > 0 ? "up" : "flat",
      Icon: Users,
      bg: "bg-info",
      items: k.pipeline.map((c) => ({
        id: c.id,
        primary: c.name,
        secondary: c.assignedSalesman?.name ?? undefined,
        status: c.status,
        href: `/dashboard/manager/clients/${c.id}`,
      })),
      emptyMessage: "No leads or follow-ups in the pipeline.",
      viewAllHref: "/dashboard/manager/clients",
      viewAllLabel: `Go to clients${more(k.pipelineTotal, k.pipeline.length)}`,
    },
    {
      label: "Team KPI Score",
      value: avgKpi,
      badgeLabel: `${kpiChangePct > 0 ? "+" : ""}${kpiChangePct}% change`,
      direction: kpiChangePct > 0 ? "up" : kpiChangePct < 0 ? "down" : "flat",
      Icon: BarChart3,
      bg: "bg-primary",
      items: sortedSalesmen.map((s) => ({
        id: s.id,
        primary: s.name,
        secondary: `${s.totalClients} client${s.totalClients === 1 ? "" : "s"}`,
        meta: `KPI ${s.kpiScore}`,
        href: `/dashboard/manager/team/${s.id}`,
      })),
      emptyMessage: "No salesmen on your team yet.",
      viewAllHref: "/dashboard/manager/team",
      viewAllLabel: "Go to team",
    },
    {
      label: "Overdue Tasks",
      value: overdueCount,
      badgeLabel: `${overdueCount} pending`,
      direction: overdueCount > 0 ? "up" : "flat",
      Icon: XCircle,
      bg: "bg-primary",
      items: k.overdue.map((t) => ({
        id: t.id,
        primary: t.description,
        secondary: t.assignedTo?.name,
        meta: `Due ${formatDate(t.due_date)}`,
        status: t.status,
      })),
      emptyMessage: "No overdue tasks. Nice work!",
      viewAllHref: "/dashboard/manager/tasks",
      viewAllLabel: `Go to tasks${more(overdueCount, k.overdue.length)}`,
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <StatCardWithDetails
          key={card.label}
          label={card.label}
          value={card.value}
          items={card.items}
          emptyMessage={card.emptyMessage}
          viewAllHref={card.viewAllHref}
          viewAllLabel={card.viewAllLabel}
        >
          <StatCard
            icon={card.Icon}
            label={card.label}
            value={card.value}
            badgeLabel={card.badgeLabel}
            badgeDirection={card.direction}
            theme={{ bg: card.bg }}
          />
        </StatCardWithDetails>
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
  const [sortedSalesmen, orgData] = await Promise.all([getManagerTeam(managerId), getCachedManagerOrg(managerId)]);

  const salesmanIds = sortedSalesmen.map((s) => s.id);
  const [taskStats, activityFeed] = await Promise.all([
    getManagerTaskStats(salesmanIds),
    getCachedManagerActivityFeed(salesmanIds),
  ]);
  const orgName = orgData[0]?.name ?? "—";
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  if (sortedSalesmen.length === 0) {
    return (
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Salesman Performance
          </h2>
          <p className="text-xs text-muted-foreground">this month</p>
        </div>
        <div className="rounded-2xl border border-foreground bg-primary p-10 text-center">
          <p className="text-sm text-muted-foreground">
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

  // Task stats per salesman (counted in SQL)
  const taskStatsMap = new Map(Object.entries(taskStats).map(([id, v]) => [Number(id), v]));

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
        <h2 className="text-base font-semibold text-foreground">
          <Link href="/dashboard/manager/team" className="transition hover:text-primary hover:underline underline-offset-4">
            Salesman Performance
          </Link>
        </h2>
        <p className="text-xs text-muted-foreground">this month</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
        {/* ── LEFT: Top Performer Spotlight ── */}
        <div className="relative h-full flex flex-col overflow-hidden rounded-2xl border border-foreground bg-primary">
          <span className="absolute inset-x-0 top-0 h-[3px] bg-success" aria-hidden />

          <div className="p-4 pt-5 flex flex-col flex-1">
            {/* Top badge */}
            <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-success/20 bg-success/15 px-2.5 py-1 text-xs font-semibold text-success-foreground mb-3">
              <Trophy size={11} strokeWidth={2.5} />
              Top Performer
            </span>

            {/* Avatar + Name + Score */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className={cn(
                  "h-11 w-11 shrink-0 flex items-center justify-center rounded-full text-white text-sm font-semibold ring-2 ring-success/40",
                  getAvatarColor(topSalesman.name)
                )}
              >
                {getInitials(topSalesman.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {topSalesman.name}
                </p>
                <p className="text-xs text-muted-foreground/80 truncate">Salesman · {orgName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-2xl font-semibold leading-none text-success-foreground tabular-nums">
                  {topSalesman.kpiScore}
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  KPI Score
                </p>
              </div>
            </div>

            {/* 4 stat boxes */}
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              <div className="rounded-lg border border-white/5 bg-card/[0.04] px-1.5 py-1.5 text-center">
                <p className="font-display text-sm font-semibold text-success-foreground">
                  {topOnboarded}
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Onboarded
                </p>
              </div>
              <div className="rounded-lg border border-white/5 bg-card/[0.04] px-1.5 py-1.5 text-center">
                <p className="font-display text-sm font-semibold text-primary">
                  {topFollowUp}
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Follow-up
                </p>
              </div>
              <div className="rounded-lg border border-white/5 bg-card/[0.04] px-1.5 py-1.5 text-center">
                <p className="font-display text-sm font-semibold text-warning-foreground">
                  {topNewLead}
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  New Lead
                </p>
              </div>
              <div className="rounded-lg border border-white/5 bg-card/[0.04] px-1.5 py-1.5 text-center">
                <p className="font-display text-sm font-semibold text-danger-foreground">
                  {topSalesman.counts.lost ?? 0}
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground">
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
                  color: "bg-success",
                },
                {
                  label: "Follow-up",
                  value: topFollowUp,
                  color: "bg-primary",
                },
                {
                  label: "New Lead",
                  value: topNewLead,
                  color: "bg-warning",
                },
              ].map((bar) => (
                <div key={bar.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-muted-foreground/80">
                      {bar.label}
                    </span>
                    <span className="text-[11px] font-semibold text-white">
                      {bar.value}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-primary">
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
            <div className="mt-auto flex items-center justify-between border-t border-foreground pt-3">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Tasks Completed
                </p>
                <p className="text-xs font-semibold text-muted-foreground/60">
                  {topStats.completed}/{topStats.total}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground font-medium">
                  Last Active
                </p>
                <p className="text-xs font-semibold text-muted-foreground/60">
                  {topLastActive ? getTimeAgo(topLastActive) : "No activity"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Team Leaderboard ── */}
        <div className="h-full flex flex-col rounded-2xl border border-foreground bg-primary p-4">
          <div className="mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-warning-foreground" />
              <h3 className="text-sm font-semibold text-white">
                Team Leaderboard
              </h3>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              all salesmen ranked by KPI score
            </p>
          </div>

          <div className="space-y-0 divide-y divide-foreground overflow-y-auto flex-1 min-h-0 max-h-[420px] pr-1">
            {sortedSalesmen.map((s, idx) => {
              const lastActive = lastActiveMap.get(s.id);
              const isActive24h =
                lastActive && lastActive >= twentyFourHoursAgo;
              const statusDotColor = isActive24h
                ? "bg-success"
                : s.kpiScore < 60
                  ? "bg-warning"
                  : "bg-muted-foreground";

              const barColor =
                s.kpiScore >= 75
                  ? "bg-success"
                  : s.kpiScore >= 50
                    ? "bg-warning"
                    : "bg-danger";
              const scoreColor =
                s.kpiScore >= 75
                  ? "text-success-foreground"
                  : s.kpiScore >= 50
                    ? "text-warning-foreground"
                    : "text-danger-foreground";

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
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        #{idx + 1}
                      </span>
                    )}
                  </span>

                  {/* Avatar with status dot */}
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        "h-7 w-7 flex items-center justify-center rounded-full text-white text-[10px] font-semibold",
                        getAvatarColor(s.name)
                      )}
                    >
                      {getInitials(s.name)}
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-foreground",
                        statusDotColor
                      )}
                    />
                  </div>

                  {/* Name + last active */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {s.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {lastActive ? getTimeAgo(lastActive) : "No activity"}
                    </p>
                  </div>

                  {/* Mini stats */}
                  <div className="hidden sm:flex items-center gap-2.5 shrink-0">
                    <div className="text-center">
                      <p className="text-xs font-semibold text-muted-foreground/60 tabular-nums">
                        {s.totalClients}
                      </p>
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        CLIENTS
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-success-foreground tabular-nums">
                        {s.counts.onboarded ?? 0}
                      </p>
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        ON
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-danger-foreground tabular-nums">
                        {s.counts.lost ?? 0}
                      </p>
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        LOST
                      </p>
                    </div>
                  </div>

                  {/* Score bar + score */}
                  <div className="w-16 shrink-0">
                    <div className="h-1.5 rounded-full bg-primary overflow-hidden mb-1">
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
                        "text-[11px] font-semibold text-right tabular-nums",
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
  const team = await getManagerTeam(managerId);
  const pending = await getManagerPendingTasks(team.map((s) => s.id));
  const allCounts = teamCounts(team);

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

  // Earliest-due open tasks (already sorted and capped in SQL)
  const pendingTasks = pending.rows;

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
        color: "text-danger-foreground",
        dotColor: "bg-danger",
      };
    }
    if (diffDays === 0) {
      return {
        label: "Due today",
        color: "text-warning-foreground",
        dotColor: "bg-warning",
      };
    }
    if (diffDays === 1) {
      return {
        label: "Due tomorrow",
        color: "text-muted-foreground/60",
        dotColor: "bg-primary",
      };
    }
    return {
      label: `Due in ${diffDays}d`,
      color: "text-muted-foreground/60",
      dotColor: "bg-primary",
    };
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ── LEFT: Conversion Funnel ── */}
      <SectionCard title="Team Conversion Funnel" subtitle="this month" href="/dashboard/manager/clients">
        <div className="space-y-4">
          {/* Funnel bars */}
          {[
            {
              label: "New Leads",
              count: newLeads,
              pct: 100,
              color: "bg-primary",
            },
            {
              label: "Follow-up",
              count: followUp,
              pct: followUpPct,
              color: "bg-primary",
            },
            {
              label: "Onboarded",
              count: onboarded,
              pct: onboardedPct,
              color: "bg-success",
            },
          ].map((bar) => (
            <div key={bar.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-foreground/70">
                  {bar.label}
                </span>
                <span className="text-[11px] font-semibold text-foreground">
                  {bar.count}
                </span>
              </div>
              <div className="h-8 rounded-lg overflow-hidden bg-muted">
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
                    <span className="text-xs font-semibold text-white">
                      {bar.count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Divider + conversion rate */}
          <div className="border-t border-border pt-4 text-center">
            <p className="text-3xl font-semibold text-success-foreground tabular-nums">
              {conversionRate}%
            </p>
            <p className="text-xs font-medium text-muted-foreground/80 mt-1">
              Team Conversion Rate
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ── RIGHT: Pending Tasks ── */}
      <SectionCard
        title="Pending Tasks"
        subtitle={pending.total > pendingTasks.length ? `earliest ${pendingTasks.length} of ${pending.total}` : "by salesman"}
        href="/dashboard/manager/tasks"
        className="h-auto lg:h-[420px] flex flex-col"
        bodyClassName="flex-1 min-h-0"
      >
        <div className="space-y-0 divide-y divide-border overflow-y-auto h-full pr-1">
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
                    <p className="text-xs font-medium text-foreground truncate">
                      {task.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80">
                      {task.assignedTo.name?.split(" ")[0] ?? "Unassigned"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-semibold shrink-0",
                      due.color
                    )}
                  >
                    {due.label}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground/80 text-center py-6">
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
  onboarded: { bg: "bg-success", Icon: Check },
  follow_up: { bg: "bg-info", Icon: RefreshCw },
  lead: { bg: "bg-warning", Icon: Target },
  lost: { bg: "bg-danger", Icon: X },
};

function getActionIcon(action: string) {
  const lower = action.toLowerCase();
  if (lower.includes("onboarded")) return ACTION_ICON_MAP.onboarded;
  if (lower.includes("follow")) return ACTION_ICON_MAP.follow_up;
  if (lower.includes("lead") || lower.includes("new"))
    return ACTION_ICON_MAP.lead;
  if (lower.includes("lost") || lower.includes("cancel"))
    return ACTION_ICON_MAP.lost;
  return { bg: "bg-muted-foreground", Icon: Clock };
}

export async function ManagerActivityFeed({
  managerId,
}: {
  managerId: number;
}) {
  const team = await getManagerTeam(managerId);
  const activityFeed = await getCachedManagerActivityFeed(team.map((s) => s.id));

  return (
    <SectionCard title="Team Activity" subtitle="live feed" icon={Clock} iconClassName="text-info-foreground" href="/dashboard/manager/clients">
      <div className="space-y-0 divide-y divide-border">
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
                  <p className="text-xs text-foreground/85 leading-relaxed">
                    <span className="font-semibold text-foreground">
                      {log.author.name.split(" ")[0]}
                    </span>{" "}
                    <span className="text-muted-foreground">{log.action}</span>
                    {log.client.name && (
                      <>
                        {" "}
                        for{" "}
                        <span className="font-semibold text-foreground">
                          {log.client.name}
                        </span>
                      </>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                    {getTimeAgo(log.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-muted-foreground/80 text-center py-6">
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
    <SectionCard title="Team orders: collected vs pending" href="/dashboard/manager/orders">
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
        <div key={i} className="rounded-card border border-border bg-card p-5 animate-pulse">
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
  const dark = "animate-pulse rounded-lg bg-primary";
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
        <div className="rounded-2xl border border-foreground bg-primary p-4 space-y-3">
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
        <div className="rounded-2xl border border-foreground bg-primary p-4 space-y-3">
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
      <div className="rounded-card border border-border bg-card p-5 space-y-4">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 3 }).map((_, j) => (
          <div key={j} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-10 w-16 mx-auto" />
      </div>
      <div className="rounded-card border border-border bg-card p-5 space-y-4">
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
    <div className="rounded-card border border-border bg-card p-5 space-y-4">
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
    <div className="rounded-card border border-border bg-card p-5 space-y-4">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-[280px] w-full rounded-xl" />
    </div>
  );
}
