import { prisma } from "@/lib/prisma";
import { getManagerSalesmanIds } from "@/lib/scoping";
import type { SalesmanTargetRow, SalesmanTargetView, TargetState } from "@/types/salesman-target";

const DAY_MS = 24 * 60 * 60 * 1000;

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

  return Promise.all(
    salesmen.map(async (salesman) => {
      const history: SalesmanTargetView[] = await Promise.all(
        salesman.salesmanTargets.map(async (target) => {
          const aggregate = await prisma.order.aggregate({
            _sum: { amount: true },
            where: {
              created_by_id: salesman.id,
              status: { not: "cancelled" },
              created_at: { gte: target.period_start, lt: new Date(target.period_end.getTime() + DAY_MS) },
            },
          });
          const amount = target.amount.toNumber();
          const achieved = aggregate._sum.amount?.toNumber() ?? 0;
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
        })
      );

      return {
        id: salesman.id,
        name: salesman.name,
        email: salesman.email,
        clientCount: salesman._count.assignedClients,
        current: history.find((item) => item.state === "active") ?? null,
        history,
      };
    })
  );
}
