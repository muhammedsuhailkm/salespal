import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enquiryRef, enquiryStatuses, type EnquiryStatus } from "@/types/enquiry";

/** Orders, enquiries and money for one client. Callers check access to the client first. */

export const CLIENT_HISTORY_PAGE_SIZE = 10;

const pageOf = (value: unknown) => Math.max(1, Math.floor(Number(value)) || 1);
type Num = number | string | null;
const n = (v: Num) => Number(v ?? 0);

export type ClientSummary = Awaited<ReturnType<typeof getClientSummary>>;

export async function getClientSummary(clientId: number) {
  const [[o], enquiryRows] = await Promise.all([
    prisma.$queryRaw<
      { orders: Num; value: Num; paid: Num; outstanding: Num; overdue: Num; overdue_count: Num; completed: Num; open: Num; voided: Num; first_order: Date | null; last_order: Date | null; profit: Num }[]
    >(Prisma.sql`
      SELECT COUNT(*) FILTER (WHERE o.status NOT IN ('cancelled', 'revision_requested'))::int AS orders,
             COALESCE(SUM(o.amount) FILTER (WHERE o.status NOT IN ('cancelled', 'revision_requested')), 0)::float8 AS value,
             COALESCE(SUM(o.paid_total), 0)::float8 AS paid,
             COALESCE(SUM(GREATEST(o.amount - o.paid_total, 0)) FILTER (WHERE o.status NOT IN ('cancelled', 'revision_requested')), 0)::float8 AS outstanding,
             COALESCE(SUM(GREATEST(o.amount - o.paid_total, 0)) FILTER (
               WHERE o.status NOT IN ('cancelled', 'revision_requested') AND o.due_date < CURRENT_DATE AND o.amount - o.paid_total > 0.005), 0)::float8 AS overdue,
             COUNT(*) FILTER (
               WHERE o.status NOT IN ('cancelled', 'revision_requested') AND o.due_date < CURRENT_DATE AND o.amount - o.paid_total > 0.005)::int AS overdue_count,
             COUNT(*) FILTER (WHERE o.status = 'completed')::int AS completed,
             COUNT(*) FILTER (WHERE o.status IN ('transit', 'delivered'))::int AS open,
             COUNT(*) FILTER (WHERE o.status IN ('cancelled', 'revision_requested'))::int AS voided,
             MIN(o.created_at) FILTER (WHERE o.status <> 'cancelled') AS first_order,
             MAX(o.created_at) FILTER (WHERE o.status <> 'cancelled') AS last_order,
             COALESCE(SUM(COALESCE(e.actual_profit, e.provisional_profit)) FILTER (WHERE o.status NOT IN ('cancelled', 'revision_requested')), 0)::float8 AS profit
      FROM orders o
      LEFT JOIN enquiries e ON e.id = o.enquiry_id
      WHERE o.client_id = ${clientId}`),
    prisma.enquiry.groupBy({ by: ["status"], where: { client_id: clientId }, _count: { _all: true } }),
  ]);

  const enquiries = Object.fromEntries(enquiryStatuses.map((s) => [s, 0])) as Record<EnquiryStatus, number>;
  for (const r of enquiryRows) if (r.status in enquiries) enquiries[r.status as EnquiryStatus] = r._count._all;
  const enquiryTotal = enquiryRows.reduce((a, r) => a + r._count._all, 0);
  const decided = enquiries.confirmed + enquiries.lost;
  const orders = n(o.orders);

  return {
    orders,
    value: n(o.value),
    paid: n(o.paid),
    outstanding: n(o.outstanding),
    overdue: n(o.overdue),
    overdueCount: n(o.overdue_count),
    completed: n(o.completed),
    open: n(o.open),
    voided: n(o.voided),
    profit: n(o.profit),
    averageOrder: orders ? n(o.value) / orders : 0,
    firstOrder: o.first_order?.toISOString() ?? null,
    lastOrder: o.last_order?.toISOString() ?? null,
    enquiries,
    enquiryTotal,
    activeEnquiries: enquiryTotal - decided,
    winRate: decided ? (enquiries.confirmed / decided) * 100 : null,
  };
}

export type ClientOrderRow = {
  id: number;
  created_at: string;
  job_no: string | null;
  enquiry_id: number | null;
  enquiry_ref: string | null;
  mode: string;
  from: string;
  to: string;
  status: string;
  amount: number;
  paid: number;
  balance: number;
  invoice_date: string | null;
  due_date: string | null;
  overdue: boolean;
};

export async function getClientOrdersPage(clientId: number, page: unknown) {
  const where = { client_id: clientId };
  const total = await prisma.order.count({ where });
  const current = Math.min(pageOf(page), Math.max(1, Math.ceil(total / CLIENT_HISTORY_PAGE_SIZE)));
  const rows = await prisma.order.findMany({
    where,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    skip: (current - 1) * CLIENT_HISTORY_PAGE_SIZE,
    take: CLIENT_HISTORY_PAGE_SIZE,
  });
  const today = new Date(new Date().toISOString().slice(0, 10));
  return {
    total,
    page: current,
    pageSize: CLIENT_HISTORY_PAGE_SIZE,
    rows: rows.map((r): ClientOrderRow => {
      const amount = r.amount.toNumber();
      const paid = r.paid_total.toNumber();
      const voided = r.status === "cancelled" || r.status === "revision_requested";
      const balance = voided ? 0 : Math.max(amount - paid, 0);
      return {
        id: r.id,
        created_at: r.created_at.toISOString(),
        job_no: r.job_no,
        enquiry_id: r.origin_enquiry_id,
        enquiry_ref: r.origin_enquiry_id ? enquiryRef(r.origin_enquiry_id) : null,
        mode: r.mode,
        from: r.from,
        to: r.to,
        status: r.status,
        amount,
        paid,
        balance,
        invoice_date: r.invoice_date?.toISOString().slice(0, 10) ?? null,
        due_date: r.due_date?.toISOString().slice(0, 10) ?? null,
        overdue: !!r.due_date && r.due_date < today && balance > 0.005,
      };
    }),
  };
}

export type ClientEnquiryRow = {
  id: number;
  ref: string;
  enquiry_date: string;
  mode: string;
  from: string;
  to: string;
  status: EnquiryStatus;
  cost: number | null;
  profit: number | null;
  order_id: number | null;
  created_by: string;
  lost_reason: string | null;
};

export async function getClientEnquiriesPage(clientId: number, page: unknown) {
  const where = { client_id: clientId };
  const total = await prisma.enquiry.count({ where });
  const current = Math.min(pageOf(page), Math.max(1, Math.ceil(total / CLIENT_HISTORY_PAGE_SIZE)));
  const rows = await prisma.enquiry.findMany({
    where,
    orderBy: [{ enquiry_date: "desc" }, { id: "desc" }],
    skip: (current - 1) * CLIENT_HISTORY_PAGE_SIZE,
    take: CLIENT_HISTORY_PAGE_SIZE,
    include: { createdBy: { select: { name: true } }, order: { select: { id: true } } },
  });
  return {
    total,
    page: current,
    pageSize: CLIENT_HISTORY_PAGE_SIZE,
    rows: rows.map(
      (r): ClientEnquiryRow => ({
        id: r.id,
        ref: enquiryRef(r.id),
        enquiry_date: r.enquiry_date.toISOString().slice(0, 10),
        mode: r.mode,
        from: r.from,
        to: r.to,
        status: r.status as EnquiryStatus,
        cost: (r.actual_cost ?? r.provisional_cost)?.toNumber() ?? null,
        profit: (r.actual_profit ?? r.provisional_profit)?.toNumber() ?? null,
        order_id: r.order?.id ?? null,
        created_by: r.createdBy.name,
        lost_reason: r.status === "lost" ? r.cancel_reason : null,
      }),
    ),
  };
}

export type ClientHistory = {
  summary: ClientSummary;
  orders: Awaited<ReturnType<typeof getClientOrdersPage>>;
  enquiries: Awaited<ReturnType<typeof getClientEnquiriesPage>>;
};

export async function getClientHistory(clientId: number, params: { o_page?: string; e_page?: string }): Promise<ClientHistory> {
  const [summary, orders, enquiries] = await Promise.all([
    getClientSummary(clientId),
    getClientOrdersPage(clientId, params.o_page),
    getClientEnquiriesPage(clientId, params.e_page),
  ]);
  return { summary, orders, enquiries };
}
