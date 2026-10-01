import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enquiryRef } from "@/types/enquiry";

/** Credit orders raised without an enquiry have no agreed credit days. */
export const DEFAULT_CREDIT_DAYS = 30;

/** How many rows each dashboard panel lists; counts and totals always cover everything. */
const PANEL_LIMIT = 100;

export type ReceivableOrder = {
  id: number;
  client_name: string;
  client_email: string | null;
  client_phone: string;
  salesman: string;
  job_no: string | null;
  payment_mode: string;
  amount: number;
  paid_amount: number;
  balance: number;
  due_date: string; // YYYY-MM-DD
  days_overdue: number; // 0 when not yet due
};

export type NewEnquiry = {
  id: number;
  ref: string;
  client_name: string;
  enquiry_date: string;
  mode: string;
  from: string;
  to: string;
  created_by: string;
  provisional_value: number;
};

/** Companies the owner assigned this accountant to. */
export async function getAccountantCompanies(accountantId: number) {
  const rows = await prisma.accountantOrg.findMany({
    where: { accountant_id: accountantId },
    select: { org: { select: { id: true, name: true } } },
    orderBy: { org: { name: "asc" } },
  });
  return rows.map((r) => r.org);
}

/**
 * Orders with a balance in the given companies, computed in SQL.
 * Due date: the one set at conversion when present, otherwise order date + credit days
 * (the enquiry's, or DEFAULT_CREDIT_DAYS for credit orders); cash/card are due on the order date.
 */
function receivablesCte(orgIds: number[]) {
  return Prisma.sql`
    WITH r AS (
      SELECT o.id, c.name AS client_name, c.mail_id AS client_email, c.contact_no AS client_phone, u.name AS salesman,
             o.job_no, o.payment_mode, o.amount::float8 AS amount, o.paid_total::float8 AS paid_amount,
             (o.amount - o.paid_total)::float8 AS balance,
             COALESCE(o.due_date, o.created_at::date + CASE WHEN o.payment_mode = 'credit' THEN COALESCE(e.credit_days, ${DEFAULT_CREDIT_DAYS}::int) ELSE 0 END) AS due
      FROM orders o
      JOIN clients c ON c.id = o.client_id
      JOIN users u ON u.id = o.created_by_id
      LEFT JOIN enquiries e ON e.id = o.enquiry_id
      WHERE o.status <> 'cancelled' AND o.amount - o.paid_total > 0.005 AND c.org_id IN (${Prisma.join(orgIds)})
    )`;
}

type ReceivableSqlRow = Omit<ReceivableOrder, "due_date"> & { due: Date };

const toReceivable = (r: ReceivableSqlRow): ReceivableOrder => ({
  id: r.id,
  client_name: r.client_name,
  client_email: r.client_email,
  client_phone: r.client_phone,
  salesman: r.salesman,
  job_no: r.job_no,
  payment_mode: r.payment_mode,
  amount: Number(r.amount),
  paid_amount: Number(r.paid_amount),
  balance: Number(r.balance),
  due_date: r.due.toISOString().slice(0, 10),
  days_overdue: Number(r.days_overdue),
});

/** Scoped to the clients of `orgIds` — the companies the accountant is assigned to. */
export async function getAccountantDashboard(orgIds: number[]) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const inOrgs = { client: { org_id: { in: orgIds } } };
  const cte = receivablesCte(orgIds);

  const [summary, pastDueRows, pendingRows, enquiries, enquiryCount, collectedThisMonth, advancesThisMonth] = await Promise.all([
    prisma.$queryRaw<{ pending_count: number; outstanding: number; past_due_count: number; past_due: number }[]>(Prisma.sql`
      ${cte}
      SELECT COUNT(*)::int AS pending_count, COALESCE(SUM(balance), 0)::float8 AS outstanding,
             COUNT(*) FILTER (WHERE due < ${today}::date)::int AS past_due_count,
             COALESCE(SUM(balance) FILTER (WHERE due < ${today}::date), 0)::float8 AS past_due
      FROM r`),
    prisma.$queryRaw<ReceivableSqlRow[]>(Prisma.sql`
      ${cte}
      SELECT *, (${today}::date - due)::int AS days_overdue FROM r WHERE due < ${today}::date
      ORDER BY days_overdue DESC, id LIMIT ${PANEL_LIMIT}`),
    prisma.$queryRaw<ReceivableSqlRow[]>(Prisma.sql`
      ${cte}
      SELECT *, GREATEST(${today}::date - due, 0)::int AS days_overdue FROM r
      ORDER BY due ASC, id LIMIT ${PANEL_LIMIT}`),
    prisma.enquiry.findMany({
      where: { status: "open", order: null, ...inOrgs },
      include: { client: { select: { name: true } }, createdBy: { select: { name: true } } },
      orderBy: [{ enquiry_date: "desc" }, { id: "desc" }],
      take: PANEL_LIMIT,
    }),
    prisma.enquiry.count({ where: { status: "open", order: null, ...inOrgs } }),
    prisma.orderPayment.aggregate({ where: { paid_on: { gte: monthStart }, order: inOrgs }, _sum: { amount: true } }),
    prisma.order.aggregate({ where: { created_at: { gte: monthStart }, status: { not: "cancelled" }, ...inOrgs }, _sum: { advance_amount: true } }),
  ]);

  const s = summary[0];
  const newEnquiries: NewEnquiry[] = enquiries.map((e) => ({
    id: e.id,
    ref: enquiryRef(e.id),
    client_name: e.client.name,
    enquiry_date: e.enquiry_date.toISOString().slice(0, 10),
    mode: e.mode,
    from: e.from,
    to: e.to,
    created_by: e.createdBy.name,
    provisional_value: e.provisional_cost.toNumber() + e.provisional_profit.toNumber(),
  }));

  return {
    pending: pendingRows.map(toReceivable),
    pastDue: pastDueRows.map(toReceivable),
    newEnquiries,
    counts: { pending: Number(s.pending_count), pastDue: Number(s.past_due_count), newEnquiries: enquiryCount },
    totals: {
      outstanding: Number(s.outstanding),
      pastDue: Number(s.past_due),
      collectedThisMonth:
        (collectedThisMonth._sum.amount?.toNumber() ?? 0) + (advancesThisMonth._sum.advance_amount?.toNumber() ?? 0),
    },
  };
}
