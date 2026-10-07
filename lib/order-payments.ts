import type { Prisma } from "@prisma/client";

/** Paid in full, with a cent of tolerance for decimal rounding. */
export function isFullyPaid(paid: number, amount: number) {
  return paid >= amount - 0.005;
}

/**
 * Recomputes orders.paid_total from the source rows (advance + recorded payments).
 * Call inside the same transaction as any change to an order's amount, advance or payments.
 */
export async function syncOrderPayments(tx: Prisma.TransactionClient, orderId: number) {
  const [order, payments] = await Promise.all([
    tx.order.findUnique({ where: { id: orderId }, select: { advance_amount: true } }),
    tx.orderPayment.aggregate({ where: { order_id: orderId }, _sum: { amount: true } }),
  ]);
  if (!order) return;

  const paid = order.advance_amount.toNumber() + (payments._sum.amount?.toNumber() ?? 0);
  await tx.order.update({ where: { id: orderId }, data: { paid_total: paid } });
}
