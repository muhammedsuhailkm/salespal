import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { literal } from "@/lib/list-params";
import { calculateKpiScore } from "@/lib/kpi";

/**
 * Owner dashboard aggregates. Everything is counted in Postgres and returns a few hundred bytes,
 * so results fit the Next data cache (the old load-everything queries were over its 2 MB limit).
 * Dates are passed as ISO strings so they work as cache keys.
 */

// Also refreshed whenever clients change (those mutations revalidate "admin-clients").
const CACHE = { revalidate: 30, tags: ["admin-dashboard", "admin-clients"] };

type Counts = Record<string, number>;

// Clients onboarded in the period, counted while they are onboarded / dormant / lost (same rule as before).
const ONBOARDED_NOW = ["onboarded", "dormant", "lost"];
const LOST_NOW = ["lost", "blacklisted"];

function range(sinceIso: string, untilIso?: string): Prisma.DateTimeFilter {
  return untilIso ? { gte: new Date(sinceIso), lte: new Date(untilIso) } : { gte: new Date(sinceIso) };
}

async function statusCounts(where: Prisma.ClientWhereInput): Promise<Counts> {
  const rows = await prisma.client.groupBy({ by: ["status"], where, _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
}

/** KPI cards: client status counts + onboarded / lost log counts for the period and the previous one. */
export const getAdminKpiCounts = unstable_cache(
  async (orgId: number | null, start: string, end: string | null, prevStart: string, prevEnd: string) => {
    const org = orgId ? { org_id: orgId } : {};
    // A log counts while its client still holds a matching status (same rule as before).
    const logCount = (action: string, statuses: string[], since: string, until?: string) =>
      prisma.clientLog.count({
        where: { action: { contains: literal(action) }, created_at: range(since, until), client: { status: { in: statuses }, ...org } },
      });
    const [counts, onboardedThis, onboardedPrev, lostThis, lostPrev] = await Promise.all([
      statusCounts(org),
      logCount("onboarded", ONBOARDED_NOW, start, end ?? undefined),
      logCount("onboarded", ONBOARDED_NOW, prevStart, prevEnd),
      logCount("lost", LOST_NOW, start, end ?? undefined),
      logCount("lost", LOST_NOW, prevStart, prevEnd),
    ]);
    return { counts, onboardedThis, onboardedPrev, lostThis, lostPrev };
  },
  ["admin-kpi-counts"],
  CACHE
);

/** Company scorecards: per-company status counts, the company's (first) manager and that manager's team KPI. */
export const getAdminCompanyScorecards = unstable_cache(
  async () => {
    const [byOrg, bySalesman, orgs, managers] = await Promise.all([
      prisma.client.groupBy({ by: ["org_id", "status"], _count: { _all: true } }),
      prisma.client.groupBy({ by: ["assigned_salesman_id", "status"], _count: { _all: true } }),
      prisma.organization.findMany({ select: { id: true, name: true } }),
      prisma.user.findMany({
        where: { role_id: 2 },
        select: { name: true, managerOrgs: { select: { org_id: true } }, managerSalesmen: { select: { salesman_id: true, org_id: true } } },
        orderBy: { id: "asc" },
      }),
    ]);

    const orgCounts = new Map<number, Counts>();
    for (const r of byOrg) {
      const c = orgCounts.get(r.org_id) ?? {};
      c[r.status] = r._count._all;
      orgCounts.set(r.org_id, c);
    }
    const salesmanKpi = new Map<number, Counts>();
    for (const r of bySalesman) {
      const c = salesmanKpi.get(r.assigned_salesman_id) ?? {};
      c[r.status] = r._count._all;
      salesmanKpi.set(r.assigned_salesman_id, c);
    }

    // Companies that have clients, lowest id first (as before).
    return [...orgCounts.keys()]
      .sort((a, b) => a - b)
      .map((oid) => {
        const counts = orgCounts.get(oid)!;
        const mgr = managers.find((m) => m.managerOrgs.some((mo) => mo.org_id === oid));
        const teamKpi = mgr
          ? mgr.managerSalesmen
              .filter((ms) => ms.org_id === oid) // only the salesmen working for this company
              .reduce((sum, ms) => sum + calculateKpiScore(salesmanKpi.get(ms.salesman_id) ?? {}), 0)
          : 0;
        return {
          oid,
          orgName: orgs.find((o) => o.id === oid)?.name ?? `Org ${oid}`,
          counts,
          kpiScore: calculateKpiScore(counts),
          managerName: mgr?.name ?? "Unassigned",
          teamKpi,
          total: Object.values(counts).reduce((a, b) => a + b, 0),
        };
      });
  },
  ["admin-company-scorecards"],
  CACHE
);

/** Leaderboard: every salesman's KPI over their clients (optionally only clients of one company). */
export const getAdminLeaderboard = unstable_cache(
  async (orgId: number | null) => {
    const [salesmen, grouped] = await Promise.all([
      prisma.user.findMany({
        where: { role_id: 3 },
        select: {
          id: true,
          name: true,
          salesmanManager: { select: { managerOrg: { select: { org: { select: { name: true } } } } } },
        },
      }),
      prisma.client.groupBy({ by: ["assigned_salesman_id", "status"], where: orgId ? { org_id: orgId } : {}, _count: { _all: true } }),
    ]);
    const counts = new Map<number, Counts>();
    for (const r of grouped) {
      const c = counts.get(r.assigned_salesman_id) ?? {};
      c[r.status] = r._count._all;
      counts.set(r.assigned_salesman_id, c);
    }
    return salesmen
      .map((s) => {
        const c = counts.get(s.id) ?? {};
        return {
          id: s.id,
          name: s.name,
          kpi: calculateKpiScore(c),
          clients: Object.values(c).reduce((a, b) => a + b, 0),
          company: [...new Set(s.salesmanManager.map((l) => l.managerOrg.org.name))].join(", ") || "—",
        };
      })
      .sort((a, b) => b.kpi - a.kpi);
  },
  ["admin-leaderboard"],
  CACHE
);

/** Task health: task counts by status (all tasks) + client funnel counts (optionally one company). */
export const getAdminTaskHealth = unstable_cache(
  async (orgId: number | null) => {
    const [tasks, clients] = await Promise.all([
      prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
      statusCounts(orgId ? { org_id: orgId } : {}),
    ]);
    const taskCounts: Counts = Object.fromEntries(tasks.map((t) => [t.status, t._count._all]));
    return { taskCounts, taskTotal: tasks.reduce((sum, t) => sum + t._count._all, 0), clientCounts: clients };
  },
  ["admin-task-health"],
  CACHE
);

const LOST_LIST_LIMIT = 100;

/** Lost-client log entries in the period: total count + the newest rows for the table. */
export const getAdminLostClients = unstable_cache(
  async (orgId: number | null, start: string, end: string | null) => {
    const where: Prisma.ClientLogWhereInput = {
      action: { contains: "lost" },
      created_at: range(start, end ?? undefined),
      ...(orgId ? { client: { org_id: orgId } } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.clientLog.count({ where }),
      prisma.clientLog.findMany({
        where,
        orderBy: { created_at: "desc" },
        take: LOST_LIST_LIMIT,
        select: {
          id: true,
          created_at: true,
          client: { select: { name: true, organization: { select: { name: true } } } },
          author: { select: { name: true } },
        },
      }),
    ]);
    return { total, rows };
  },
  ["admin-lost-clients"],
  CACHE
);

/** Onboarded logs per month (server time zone) and company since `sinceIso`. */
export const getAdminOnboardingTrend = unstable_cache(
  async (sinceIso: string, timeZone: string) => {
    const rows = await prisma.$queryRaw<{ y: number; m: number; org_id: number; n: number }[]>(Prisma.sql`
      SELECT EXTRACT(YEAR FROM local_ts)::int AS y, EXTRACT(MONTH FROM local_ts)::int AS m, c.org_id, COUNT(*)::int AS n
      FROM (
        SELECT l.client_id, (l.created_at AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone} AS local_ts
        FROM client_logs l
        WHERE l.action LIKE '%onboarded%' AND l.created_at >= ${new Date(sinceIso)}
      ) x
      JOIN clients c ON c.id = x.client_id
      GROUP BY 1, 2, 3`);
    return rows.map((r) => ({ year: Number(r.y), month: Number(r.m), orgId: r.org_id, count: Number(r.n) }));
  },
  ["admin-onboarding-trend"],
  { revalidate: 300, tags: ["admin-dashboard", "admin-clients"] }
);
