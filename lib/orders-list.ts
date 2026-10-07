import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { orderPaymentsInclude, serializeOrder } from "@/lib/order-serialize";
import { literal, pageParam, paging, param, PAGE_SIZE, type Paged, type SearchParams } from "@/lib/list-params";
import { VOID_ORDER_STATUSES, orderStatuses } from "@/types/order";

const orderListInclude = {
  client: { select: { id: true, name: true } },
  createdBy: { select: { name: true } },
  enquiry: { select: { provisional_cost: true, provisional_profit: true, actual_cost: true, actual_profit: true, credit_days: true } },
  ...orderPaymentsInclude,
} satisfies Prisma.OrderInclude;

type OrderWithList = Prisma.OrderGetPayload<{ include: typeof orderListInclude }>;

/** serializeOrder + the source enquiry's figures as plain numbers (Decimals can't cross to the client). */
function toOrderRow(order: OrderWithList) {
  const { enquiry, ...rest } = serializeOrder(order);
  return {
    ...rest,
    quote: enquiry
      ? {
          cost: enquiry.provisional_cost?.toNumber() ?? null,
          profit: enquiry.provisional_profit?.toNumber() ?? null,
          actual_cost: enquiry.actual_cost?.toNumber() ?? null,
          actual_profit: enquiry.actual_profit?.toNumber() ?? null,
          credit_days: enquiry.credit_days,
        }
      : null,
  };
}

export type OrderRow = ReturnType<typeof toOrderRow>;

/** Search: #00012 / 12 (order no), ENQ-00012 (enquiry), client, salesman, job no, route, description. */
function orderSearchWhere(q: string | undefined): Prisma.OrderWhereInput {
  if (!q) return {};
  const or: Prisma.OrderWhereInput[] = [
    { client: { name: { contains: literal(q), mode: "insensitive" } } },
    { createdBy: { name: { contains: literal(q), mode: "insensitive" } } },
    { job_no: { contains: literal(q), mode: "insensitive" } },
    { from: { contains: literal(q), mode: "insensitive" } },
    { to: { contains: literal(q), mode: "insensitive" } },
    { description: { contains: literal(q), mode: "insensitive" } },
  ];
  const enq = /^enq-?(\d+)$/i.exec(q);
  if (enq) or.push({ enquiry_id: Number(enq[1]) }, { origin_enquiry_id: Number(enq[1]) });
  const no = /^#?(\d+)$/.exec(q);
  if (no) or.push({ id: Number(no[1]) });
  return { OR: or };
}

/** Status (transit / delivered / completed / revision_requested / cancelled), payment (due/paid) and search filters, all applied in SQL. */
export function orderFilterWhere(params: SearchParams): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [orderSearchWhere(param(params, "q"))];
  const status = param(params, "status");
  if (status && (orderStatuses as readonly string[]).includes(status)) and.push({ status });
  const pay = param(params, "pay");
  if (pay === "due") and.push({ paid_total: { lt: prisma.order.fields.amount } });
  if (pay === "paid") and.push({ paid_total: { gte: prisma.order.fields.amount } });
  return { AND: and };
}

export type OrdersPage = Paged<OrderRow> & {
  /** Sums over every matching order that still counts (not cancelled / sent back), not just this page. */
  totals: { amount: number; paid: number; balance: number };
};

export async function getOrdersPage(scope: Prisma.OrderWhereInput, params: SearchParams): Promise<OrdersPage> {
  const page = pageParam(params);
  const where: Prisma.OrderWhereInput = { AND: [scope, orderFilterWhere(params)] };
  const [rows, total, sums] = await Promise.all([
    prisma.order.findMany({ where, include: orderListInclude, orderBy: { created_at: "desc" }, ...paging(page) }),
    prisma.order.count({ where }),
    prisma.order.aggregate({ where: { AND: [where, { status: { notIn: [...VOID_ORDER_STATUSES] } }] }, _sum: { amount: true, paid_total: true } }),
  ]);
  const amount = sums._sum.amount?.toNumber() ?? 0;
  const paid = sums._sum.paid_total?.toNumber() ?? 0;
  return { rows: rows.map(toOrderRow), total, page, pageSize: PAGE_SIZE, totals: { amount, paid, balance: amount - paid } };
}
