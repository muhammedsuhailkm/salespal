import type { Prisma } from "@prisma/client";

/** Include this on order queries so `serializeOrder` can compute what has been paid. */
export const orderPaymentsInclude = {
  payments: {
    select: {
      id: true,
      amount: true,
      paid_on: true,
      method: true,
      reference: true,
      notes: true,
      recordedBy: { select: { name: true } },
    },
    orderBy: { paid_on: "asc" },
  },
} satisfies Prisma.OrderInclude;

type PaymentRow = {
  id: number;
  amount: Prisma.Decimal;
  paid_on: Date;
  method: string;
  reference: string | null;
  notes: string | null;
  recordedBy: { name: string };
};

/**
 * Prisma's Decimal isn't safely serializable across the unstable_cache / RSC boundary,
 * so every order read converts money to plain numbers here. Paid = advance + recorded
 * payments; balance = amount - paid. Neither is persisted, to avoid drift.
 */
export function serializeOrder<
  T extends { amount: Prisma.Decimal; advance_amount: Prisma.Decimal; payments?: PaymentRow[] }
>(order: T) {
  const amount = order.amount.toNumber();
  const advance_amount = order.advance_amount.toNumber();
  const payments = (order.payments ?? []).map((p) => ({
    id: p.id,
    amount: p.amount.toNumber(),
    paid_on: p.paid_on.toISOString().slice(0, 10),
    method: p.method,
    reference: p.reference,
    notes: p.notes,
    recorded_by: p.recordedBy.name,
  }));
  const paid_amount = advance_amount + payments.reduce((sum, p) => sum + p.amount, 0);
  return { ...order, amount, advance_amount, payments, paid_amount, balance: amount - paid_amount };
}
