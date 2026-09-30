import { prisma } from "@/lib/prisma";
import { orderPaymentsInclude, serializeOrder } from "@/lib/order-serialize";
import { enquiryRef } from "@/types/enquiry";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Credit orders raised without an enquiry have no agreed credit days. */
export const DEFAULT_CREDIT_DAYS = 30;

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

/**
 * Uses the due date set at conversion when present. Otherwise: order date + credit days
 * (from the linked enquiry, or DEFAULT_CREDIT_DAYS for credit orders); cash/card are due on the order date.
 */
function dueDate(order: {
  created_at: Date;
  due_date: Date | null;
  payment_mode: string;
  enquiry: { credit_days: number | null } | null;
}) {
  if (order.due_date) return order.due_date;
  const creditDays =
    order.payment_mode === "credit" ? order.enquiry?.credit_days ?? DEFAULT_CREDIT_DAYS : 0;
  const created = new Date(Date.UTC(order.created_at.getUTCFullYear(), order.created_at.getUTCMonth(), order.created_at.getUTCDate()));
  return new Date(created.getTime() + creditDays * DAY_MS);
}

export async function getAccountantDashboard() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [orders, enquiries, collectedThisMonth, advancesThisMonth] = await Promise.all([
    prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      include: {
        client: { select: { name: true, mail_id: true, contact_no: true } },
        createdBy: { select: { name: true } },
        enquiry: { select: { credit_days: true } },
        ...orderPaymentsInclude,
      },
      orderBy: { created_at: "asc" },
    }),
    prisma.enquiry.findMany({
      where: { status: "open", order: null },
      include: { client: { select: { name: true } }, createdBy: { select: { name: true } } },
      orderBy: [{ enquiry_date: "desc" }, { id: "desc" }],
    }),
    prisma.orderPayment.aggregate({ where: { paid_on: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.order.aggregate({ where: { created_at: { gte: monthStart }, status: { not: "cancelled" } }, _sum: { advance_amount: true } }),
  ]);

  const receivables: ReceivableOrder[] = orders
    .map((raw) => {
      const order = serializeOrder(raw);
      const due = dueDate(raw);
      return {
        id: order.id,
        client_name: raw.client.name,
        client_email: raw.client.mail_id,
        client_phone: raw.client.contact_no,
        salesman: raw.createdBy.name,
        job_no: raw.job_no,
        payment_mode: raw.payment_mode,
        amount: order.amount,
        paid_amount: order.paid_amount,
        balance: order.balance,
        due_date: due.toISOString().slice(0, 10),
        days_overdue: Math.max(0, Math.floor((today.getTime() - due.getTime()) / DAY_MS)),
      };
    })
    .filter((o) => o.balance > 0.005);

  const pastDue = receivables.filter((o) => o.days_overdue > 0).sort((a, b) => b.days_overdue - a.days_overdue);
  const pending = [...receivables].sort((a, b) => a.due_date.localeCompare(b.due_date));

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
    pending,
    pastDue,
    newEnquiries,
    totals: {
      outstanding: pending.reduce((sum, o) => sum + o.balance, 0),
      pastDue: pastDue.reduce((sum, o) => sum + o.balance, 0),
      collectedThisMonth:
        (collectedThisMonth._sum.amount?.toNumber() ?? 0) + (advancesThisMonth._sum.advance_amount?.toNumber() ?? 0),
    },
  };
}
