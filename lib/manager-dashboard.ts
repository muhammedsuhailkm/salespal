import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { literal } from "@/lib/list-params";
import { calculateKpiScore } from "@/lib/kpi";

/**
 * Manager dashboard aggregates — counted in Postgres; detail lists are capped (the cards link to the full pages).
 * Dates are ISO strings so they work as cache keys.
 */

// Refreshed by client, task and team mutations too.
const CACHE = { revalidate: 30, tags: ["manager-dashboard", "manager-clients", "manager-team", "manager-tasks"] };
/** Rows shown in the KPI card pop-ups and the pending-task list. */
export const DETAIL_LIMIT = 50;

export type TeamMember = { id: number; name: string; counts: Record<string, number>; kpiScore: number; totalClients: number };

/** The manager's salesmen with their client status counts and KPI, best first. */
export const getManagerTeam = unstable_cache(
  async (managerId: number): Promise<TeamMember[]> => {
    const salesmen = await prisma.user.findMany({
      where: { salesmanManager: { some: { manager_id: managerId } } },
      select: { id: true, name: true },
    });
    const grouped = salesmen.length
      ? await prisma.client.groupBy({
          by: ["assigned_salesman_id", "status"],
          where: { assigned_salesman_id: { in: salesmen.map((s) => s.id) } },
          _count: { _all: true },
        })
      : [];
    const counts = new Map<number, Record<string, number>>();
    for (const g of grouped) {
      const c = counts.get(g.assigned_salesman_id) ?? {};
      c[g.status] = g._count._all;
      counts.set(g.assigned_salesman_id, c);
    }
    return salesmen
      .map((s) => {
        const c = counts.get(s.id) ?? {};
        return { id: s.id, name: s.name, counts: c, kpiScore: calculateKpiScore(c), totalClients: Object.values(c).reduce((a, b) => a + b, 0) };
      })
      .sort((a, b) => b.kpiScore - a.kpiScore);
  },
  ["manager-team-kpi"],
  CACHE
);

const between = (sinceIso: string, untilIso: string | null) =>
  untilIso ? { gte: new Date(sinceIso), lte: new Date(untilIso) } : { gte: new Date(sinceIso) };

/** KPI cards: log-based counts for the period (+ previous), pipeline and overdue tasks, each with a capped detail list. */
export const getManagerKpiCards = unstable_cache(
  async (
    salesmanIds: number[],
    periodStart: string,
    periodEnd: string | null,
    prevStart: string | null,
    prevEnd: string | null,
    weekStart: string
  ) => {
    const byTeam = { done_by: { in: salesmanIds } };
    const period = between(periodStart, periodEnd);
    // Same matching as before: action contains the keyword, case-insensitive.
    const logCount = (keyword: string, created_at: { gte: Date; lte?: Date }) =>
      prisma.clientLog.count({ where: { ...byTeam, created_at, action: { contains: literal(keyword), mode: "insensitive" } } });
    const weekFrom = new Date(Math.max(new Date(weekStart).getTime(), new Date(periodStart).getTime()));
    const weekRange = periodEnd ? { gte: weekFrom, lte: new Date(periodEnd) } : { gte: weekFrom };
    const pipelineWhere = { assigned_salesman_id: { in: salesmanIds }, status: { in: ["lead", "follow_up"] } };
    const overdueWhere = { assigned_to_id: { in: salesmanIds }, due_date: { lt: new Date() }, status: { in: ["pending", "in_process"] } };

    const [onboardedThis, onboardedPrev, weekLeads, weekFollowUps, onboardedLogs, pipelineTotal, pipeline, overdueTotal, overdue] =
      await Promise.all([
        logCount("onboarded", period),
        prevStart ? logCount("onboarded", between(prevStart, prevEnd)) : Promise.resolve(0),
        logCount("lead", weekRange),
        logCount("follow_up", weekRange),
        prisma.clientLog.findMany({
          where: { ...byTeam, created_at: period, action: { contains: literal("onboarded"), mode: "insensitive" } },
          orderBy: { created_at: "desc" },
          take: DETAIL_LIMIT,
          select: { id: true, created_at: true, client: { select: { name: true } }, author: { select: { name: true } } },
        }),
        prisma.client.count({ where: pipelineWhere }),
        prisma.client.findMany({
          where: pipelineWhere,
          orderBy: { created_at: "desc" },
          take: DETAIL_LIMIT,
          select: { id: true, name: true, status: true, assignedSalesman: { select: { name: true } } },
        }),
        prisma.task.count({ where: overdueWhere }),
        prisma.task.findMany({
          where: overdueWhere,
          orderBy: { due_date: "asc" },
          take: DETAIL_LIMIT,
          select: { id: true, description: true, due_date: true, status: true, assignedTo: { select: { name: true } } },
        }),
      ]);

    return { onboardedThis, onboardedPrev, weekNew: weekLeads + weekFollowUps, onboardedLogs, pipelineTotal, pipeline, overdueTotal, overdue };
  },
  ["manager-kpi-cards"],
  CACHE
);

/** Per-salesman task totals and achieved counts. */
export const getManagerTaskStats = unstable_cache(
  async (salesmanIds: number[]) => {
    if (salesmanIds.length === 0) return {} as Record<number, { total: number; completed: number }>;
    const grouped = await prisma.task.groupBy({
      by: ["assigned_to_id", "status"],
      where: { assigned_to_id: { in: salesmanIds } },
      _count: { _all: true },
    });
    const stats: Record<number, { total: number; completed: number }> = {};
    for (const g of grouped) {
      const s = (stats[g.assigned_to_id] ??= { total: 0, completed: 0 });
      s.total += g._count._all;
      if (g.status === "achieved") s.completed += g._count._all;
    }
    return stats;
  },
  ["manager-task-stats"],
  CACHE
);

/** Open (pending / in-process) team tasks: total + the earliest-due ones. */
export const getManagerPendingTasks = unstable_cache(
  async (salesmanIds: number[]) => {
    const where = { assigned_to_id: { in: salesmanIds }, status: { in: ["pending", "in_process"] } };
    const [total, rows] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy: { due_date: "asc" },
        take: DETAIL_LIMIT,
        include: { assignedTo: { select: { id: true, name: true } } },
      }),
    ]);
    return { total, rows };
  },
  ["manager-pending-tasks"],
  CACHE
);
