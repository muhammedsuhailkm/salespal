import { prisma } from "@/lib/prisma";
import { getManagerSalesmanIds } from "@/lib/scoping";
import { Prisma } from "@prisma/client";
import type { SalesmanTargetRow, SalesmanTargetView, TargetState } from "@/types/salesman-target";


export function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

function targetState(
  target: { period_start: Date; period_end: Date; closed_at: Date | null },
  achieved: number,
  amount: number,
  today: Date
): TargetState {
  if (target.closed_at) return "replaced";
  if (target.period_start > today) return "upcoming";
  if (target.period_end >= today) return "active";
  return achieved >= amount ? "achieved" : "missed";
}

/** Salesmen visible to the role (owner: all, manager: own team) with their current target and full target history. */
export async function getSalesmenWithTargets(user: { id: number; role_id: number }): Promise<SalesmanTargetRow[]> {
  const where =
    user.role_id === 1
      ? { role_id: 3 }
      : { role_id: 3, id: { in: await getManagerSalesmanIds(user.id) } };

  const salesmen = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      _count: { select: { assignedClients: true } },
      salesmanTargets: {
        orderBy: [{ period_start: "desc" }, { id: "desc" }],
        include: { setBy: { select: { name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const today = todayUtc();
  const salesmanIds = salesmen.map((s) => s.id);
  const [achievedByTarget, completedProfit] = await Promise.all([getTargetAchievements(salesmanIds), getCompletedEnquiryProfit(salesmanIds)]);

  return salesmen.map((salesman) => {
    const history: SalesmanTargetView[] = salesman.salesmanTargets.map((target) => {
      const amount = target.amount.toNumber();
      const achieved = achievedByTarget.get(target.id) ?? 0;
      return {
        id: target.id,
        amount,
        achieved,
        percent: amount > 0 ? (achieved / amount) * 100 : 0,
        period_start: target.period_start.toISOString().slice(0, 10),
        period_end: target.period_end.toISOString().slice(0, 10),
        state: targetState(target, achieved, amount, today),
        set_by: target.setBy.name,
        created_at: target.created_at.toISOString(),
      };
    });

    return {
      id: salesman.id,
      name: salesman.name,
      email: salesman.email,
      clientCount: salesman._count.assignedClients,
      completedProfit: completedProfit.get(salesman.id) ?? { profit: 0, count: 0 },
      current: history.find((item) => item.state === "active") ?? null,
      history,
    };
  });
}

/** Achieved amount for every target of these salesmen in one query: their orders created inside the period that still count (not cancelled / sent back for revision). */
async function getTargetAchievements(salesmanIds: number[]) {
  if (salesmanIds.length === 0) return new Map<number, number>();
  const rows = await prisma.$queryRaw<{ id: number; achieved: number }[]>(Prisma.sql`
    SELECT t.id, COALESCE(SUM(o.amount), 0)::float8 AS achieved
    FROM salesman_targets t
    LEFT JOIN orders o
      ON o.created_by_id = t.salesman_id
     AND o.status NOT IN ('cancelled', 'revision_requested')
     AND o.created_at >= t.period_start
     AND o.created_at < t.period_end + 1
    WHERE t.salesman_id IN (${Prisma.join(salesmanIds)})
    GROUP BY t.id
  `);
  return new Map(rows.map((r) => [r.id, Number(r.achieved)]));
}

/** Actual profit from each salesman's enquiries whose order accounts have marked completed (paid in full). */
async function getCompletedEnquiryProfit(salesmanIds: number[]) {
  const totals = new Map<number, { profit: number; count: number }>();
  if (salesmanIds.length === 0) return totals;
  const rows = await prisma.$queryRaw<{ created_by_id: number; profit: number; count: number }[]>(Prisma.sql`
    SELECT e.created_by_id, COALESCE(SUM(COALESCE(e.actual_profit, e.provisional_profit)), 0)::float8 AS profit, COUNT(*)::int AS count
    FROM enquiries e
    JOIN orders o ON o.enquiry_id = e.id AND o.status = 'completed'
    WHERE e.created_by_id IN (${Prisma.join(salesmanIds)})
    GROUP BY e.created_by_id
  `);
  for (const r of rows) totals.set(r.created_by_id, { profit: Number(r.profit), count: Number(r.count) });
  return totals;
}
