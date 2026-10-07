import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateKpiScore } from "@/lib/kpi";
import { clientStatusCounts } from "@/lib/clients-list";
import { enquiryStatuses, type EnquiryStatus } from "@/types/enquiry";

/**
 * Monthly performance report for one salesman (read-only; feeds the PDF).
 *
 * Definitions, all for the calendar month (UTC):
 *   onboarded client  – a client assigned to the salesman whose first order (not cancelled) was created this month
 *   enquiries raised  – enquiries the salesman created with an enquiry date in the month (current status shown)
 *   lost              – the salesman's enquiries marked lost during the month, with the reason given
 *   orders            – orders the salesman's enquiries produced this month; value excludes cancelled / revision requested
 *   collected         – payments recorded this month against the salesman's orders
 */

export type MonthKey = `${number}-${string}`;

export function parseMonth(value: unknown): { start: Date; end: Date; key: string } | null {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [y, m] = value.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)), key: value };
}

export function currentMonthKey(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function prevMonth(start: Date) {
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1));
}

type Num = number | string | bigint | null;
const n = (v: Num) => Number(v ?? 0);

export type SalesmanMonthlyReport = Awaited<ReturnType<typeof getSalesmanMonthlyReport>>;

export async function getSalesmanMonthlyReport(salesmanId: number, monthKey: string) {
  const month = parseMonth(monthKey);
  if (!month) throw new Error("Invalid month");
  const { start, end } = month;
  const pStart = prevMonth(start);
  // Compare as plain dates: date columns vs. JS Date params would be shifted by the DB session time zone.
  const day = (d: Date) => Prisma.sql`${d.toISOString().slice(0, 10)}::date`;
  const [S, E, P] = [day(start), day(end), day(pStart)];

  const [
    salesman,
    enquiryRows,
    modeRows,
    routeRows,
    lostRows,
    lostPrev,
    reasonRows,
    onboardedRows,
    onboardedPrev,
    newClients,
    orderRows,
    collected,
    target,
    taskRows,
    followUps,
    statusChanges,
    clientCounts,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: salesmanId },
      select: {
        name: true,
        email: true,
        phone: true,
        salesmanManager: { select: { manager: { select: { name: true } } } },
      },
    }),

    // Enquiries raised, by month (current / previous) and current status.
    prisma.$queryRaw<{ current: boolean; status: string; count: Num; quoted: Num; profit: Num; quoted_count: Num }[]>(Prisma.sql`
      SELECT e.enquiry_date >= ${S} AS current, e.status, COUNT(*)::int AS count,
             SUM(e.provisional_cost + e.provisional_profit)::float8 AS quoted,
             SUM(e.provisional_profit)::float8 AS profit,
             COUNT(e.provisional_cost)::int AS quoted_count
      FROM enquiries e
      WHERE e.created_by_id = ${salesmanId} AND e.enquiry_date >= ${P} AND e.enquiry_date < ${E}
      GROUP BY 1, 2`),

    prisma.$queryRaw<{ mode: string; count: Num; confirmed: Num }[]>(Prisma.sql`
      SELECT e.mode, COUNT(*)::int AS count, COUNT(*) FILTER (WHERE e.status = 'confirmed')::int AS confirmed
      FROM enquiries e
      WHERE e.created_by_id = ${salesmanId} AND e.enquiry_date >= ${S} AND e.enquiry_date < ${E}
      GROUP BY 1 ORDER BY 2 DESC`),

    prisma.$queryRaw<{ from: string; to: string; count: Num; confirmed: Num }[]>(Prisma.sql`
      SELECT e."from", e."to", COUNT(*)::int AS count, COUNT(*) FILTER (WHERE e.status = 'confirmed')::int AS confirmed
      FROM enquiries e
      WHERE e.created_by_id = ${salesmanId} AND e.enquiry_date >= ${S} AND e.enquiry_date < ${E}
      GROUP BY 1, 2 ORDER BY 3 DESC, 4 DESC LIMIT 5`),

    prisma.$queryRaw<{ id: number; client: string; from: string; to: string; mode: string; value: Num; reason: string | null; lost_at: Date; by: string | null }[]>(Prisma.sql`
      SELECT e.id, c.name AS client, e."from", e."to", e.mode,
             (e.provisional_cost + e.provisional_profit)::float8 AS value,
             e.cancel_reason AS reason, e.cancelled_at AS lost_at, u.name AS by
      FROM enquiries e
      JOIN clients c ON c.id = e.client_id
      LEFT JOIN users u ON u.id = e.cancelled_by_id
      WHERE e.created_by_id = ${salesmanId} AND e.status = 'lost' AND e.cancelled_at >= ${S} AND e.cancelled_at < ${E}
      ORDER BY e.cancelled_at DESC`),

    prisma.enquiry.count({ where: { created_by_id: salesmanId, status: "lost", cancelled_at: { gte: pStart, lt: start } } }),

    prisma.$queryRaw<{ reason: string; count: Num; value: Num }[]>(Prisma.sql`
      SELECT COALESCE(NULLIF(TRIM(e.cancel_reason), ''), 'No reason given') AS reason, COUNT(*)::int AS count,
             COALESCE(SUM(e.provisional_cost + e.provisional_profit), 0)::float8 AS value
      FROM enquiries e
      WHERE e.created_by_id = ${salesmanId} AND e.status = 'lost' AND e.cancelled_at >= ${S} AND e.cancelled_at < ${E}
      GROUP BY 1 ORDER BY 2 DESC, 3 DESC`),

    prisma.$queryRaw<{ id: number; name: string; company: string; first_order: Date; orders: Num; value: Num }[]>(Prisma.sql`
      WITH firsts AS (
        SELECT o.client_id, MIN(o.created_at) AS first_order
        FROM orders o JOIN clients c ON c.id = o.client_id
        WHERE c.assigned_salesman_id = ${salesmanId} AND o.status <> 'cancelled'
        GROUP BY o.client_id
      )
      SELECT c.id, c.name, org.name AS company, f.first_order,
             COUNT(o.id)::int AS orders, COALESCE(SUM(o.amount), 0)::float8 AS value
      FROM firsts f
      JOIN clients c ON c.id = f.client_id
      JOIN organizations org ON org.id = c.org_id
      LEFT JOIN orders o ON o.client_id = c.id AND o.created_at >= ${S} AND o.created_at < ${E}
                        AND o.status NOT IN ('cancelled', 'revision_requested')
      WHERE f.first_order >= ${S} AND f.first_order < ${E}
      GROUP BY c.id, c.name, org.name, f.first_order
      ORDER BY f.first_order`),

    prisma.$queryRaw<{ count: Num }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count FROM (
        SELECT o.client_id
        FROM orders o JOIN clients c ON c.id = o.client_id
        WHERE c.assigned_salesman_id = ${salesmanId} AND o.status <> 'cancelled'
        GROUP BY o.client_id
        HAVING MIN(o.created_at) >= ${P} AND MIN(o.created_at) < ${S}
      ) x`),

    prisma.$queryRaw<{ current: Num; previous: Num }[]>(Prisma.sql`
      SELECT COUNT(*) FILTER (WHERE created_at >= ${S})::int AS current,
             COUNT(*) FILTER (WHERE created_at < ${S})::int AS previous
      FROM clients
      WHERE assigned_salesman_id = ${salesmanId} AND created_at >= ${P} AND created_at < ${E}`),

    prisma.$queryRaw<{ current: boolean; status: string; count: Num; value: Num }[]>(Prisma.sql`
      SELECT o.created_at >= ${S} AS current, o.status, COUNT(*)::int AS count, COALESCE(SUM(o.amount), 0)::float8 AS value
      FROM orders o
      WHERE o.created_by_id = ${salesmanId} AND o.created_at >= ${P} AND o.created_at < ${E}
      GROUP BY 1, 2`),

    prisma.$queryRaw<{ amount: Num; count: Num }[]>(Prisma.sql`
      SELECT COALESCE(SUM(p.amount), 0)::float8 AS amount, COUNT(*)::int AS count
      FROM order_payments p JOIN orders o ON o.id = p.order_id
      WHERE o.created_by_id = ${salesmanId} AND p.paid_on >= ${S} AND p.paid_on < ${E}`),

    // The target running during this month (latest that overlaps it and wasn't replaced).
    prisma.$queryRaw<{ amount: Num; period_start: Date; period_end: Date; achieved: Num }[]>(Prisma.sql`
      SELECT t.amount::float8 AS amount, t.period_start, t.period_end,
             (SELECT COALESCE(SUM(o.amount), 0) FROM orders o
               WHERE o.created_by_id = t.salesman_id AND o.status NOT IN ('cancelled', 'revision_requested')
                 AND o.created_at >= t.period_start AND o.created_at < t.period_end + 1)::float8 AS achieved
      FROM salesman_targets t
      WHERE t.salesman_id = ${salesmanId} AND t.closed_at IS NULL
        AND t.period_start < ${E} AND t.period_end >= ${S}
      ORDER BY t.period_start DESC, t.id DESC LIMIT 1`),

    prisma.$queryRaw<{ status: string; count: Num }[]>(Prisma.sql`
      SELECT status, COUNT(*)::int AS count FROM tasks
      WHERE assigned_to_id = ${salesmanId} AND due_date >= ${S} AND due_date < ${E}
      GROUP BY 1`),

    prisma.enquiryFollowUp.count({ where: { created_by_id: salesmanId, created_at: { gte: start, lt: end } } }),

    prisma.clientLog.count({ where: { done_by: salesmanId, action: { startsWith: "Status changed" }, created_at: { gte: start, lt: end } } }),

    clientStatusCounts({ assigned_salesman_id: salesmanId }),
  ]);

  if (!salesman) return null;

  /* Enquiries */
  const byStatus = (current: boolean) => {
    const counts = Object.fromEntries(enquiryStatuses.map((s) => [s, 0])) as Record<EnquiryStatus, number>;
    let quoted = 0, profit = 0, quotedCount = 0;
    for (const r of enquiryRows.filter((r) => r.current === current)) {
      if (r.status in counts) counts[r.status as EnquiryStatus] += n(r.count);
      quoted += n(r.quoted);
      profit += n(r.profit);
      quotedCount += n(r.quoted_count);
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const decided = counts.confirmed + counts.lost;
    return {
      total,
      counts,
      quotedValue: quoted,
      quotedProfit: profit,
      quotedCount,
      margin: quoted > 0 ? (profit / quoted) * 100 : null,
      conversion: total > 0 ? (counts.confirmed / total) * 100 : null,
      winRate: decided > 0 ? (counts.confirmed / decided) * 100 : null,
      open: total - decided,
    };
  };
  const enquiries = byStatus(true);
  const enquiriesPrev = byStatus(false);

  /* Orders */
  const orderSummary = (current: boolean) => {
    const rows = orderRows.filter((r) => r.current === current);
    const counted = rows.filter((r) => r.status !== "cancelled" && r.status !== "revision_requested");
    const statusCount = (s: string) => n(rows.find((r) => r.status === s)?.count ?? 0);
    return {
      count: counted.reduce((a, r) => a + n(r.count), 0),
      value: counted.reduce((a, r) => a + n(r.value), 0),
      transit: statusCount("transit"),
      delivered: statusCount("delivered"),
      completed: statusCount("completed"),
      voided: statusCount("cancelled") + statusCount("revision_requested"),
    };
  };
  const orders = orderSummary(true);
  const ordersPrev = orderSummary(false);

  const tasks = Object.fromEntries(taskRows.map((r) => [r.status, n(r.count)])) as Record<string, number>;
  const taskTotal = Object.values(tasks).reduce((a, b) => a + b, 0);
  const t = target[0];

  return {
    month: month.key,
    monthLabel: start.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
    prevMonthLabel: pStart.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" }),
    generatedAt: new Date(),
    salesman: {
      name: salesman.name,
      email: salesman.email,
      phone: salesman.phone,
      managers: [...new Set(salesman.salesmanManager.map((m) => m.manager.name))],
    },
    kpiScore: calculateKpiScore(clientCounts),
    portfolio: clientCounts,
    onboarded: {
      count: onboardedRows.length,
      prev: n(onboardedPrev[0]?.count ?? 0),
      clients: onboardedRows.map((r) => ({ id: r.id, name: r.name, company: r.company, firstOrder: r.first_order, orders: n(r.orders), value: n(r.value) })),
      newClients: n(newClients[0]?.current ?? 0),
      newClientsPrev: n(newClients[0]?.previous ?? 0),
    },
    enquiries,
    enquiriesPrev,
    modes: modeRows.map((r) => ({ mode: r.mode, count: n(r.count), confirmed: n(r.confirmed) })),
    routes: routeRows.map((r) => ({ from: r.from, to: r.to, count: n(r.count), confirmed: n(r.confirmed) })),
    lost: {
      count: lostRows.length,
      prev: lostPrev,
      value: lostRows.reduce((a, r) => a + n(r.value), 0),
      reasons: reasonRows.map((r) => ({ reason: r.reason, count: n(r.count), value: n(r.value) })),
      items: lostRows.map((r) => ({ id: r.id, client: r.client, from: r.from, to: r.to, mode: r.mode, value: r.value === null ? null : n(r.value), reason: r.reason, lostAt: r.lost_at, by: r.by })),
    },
    orders,
    ordersPrev,
    collected: { amount: n(collected[0]?.amount ?? 0), count: n(collected[0]?.count ?? 0) },
    target: t ? { amount: n(t.amount), achieved: n(t.achieved), periodStart: t.period_start, periodEnd: t.period_end } : null,
    activity: {
      tasks: { total: taskTotal, achieved: tasks.achieved ?? 0, unsuccessful: tasks.unsuccessful ?? 0, open: (tasks.pending ?? 0) + (tasks.in_process ?? 0) },
      followUps,
      statusChanges,
    },
  };
}
