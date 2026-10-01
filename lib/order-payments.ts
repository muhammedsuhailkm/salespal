import type { Prisma } from "@prisma/client";

/** Paid in full, with a cent of tolerance for decimal rounding. */
export function isFullyPaid(paid: number, amount: number) {
  return paid >= amount - 0.005;
}

/**
 * Recomputes orders.paid_total from the source rows (advance + recorded payments) and keeps the
 * linked enquiry's stored status in step: "completed" once the order is not cancelled and paid in full.
 * Call inside the same transaction as any change to an order's amount, advance, status or payments.
 */
export async function syncOrderPayments(tx: Prisma.TransactionClient, orderId: number) {
  const [order, payments] = await Promise.all([
    tx.order.findUnique({ where: { id: orderId }, select: { amount: true, advance_amount: true, status: true, enquiry_id: true } }),
    tx.orderPayment.aggregate({ where: { order_id: orderId }, _sum: { amount: true } }),
  ]);
  if (!order) return;

  const paid = order.advance_amount.toNumber() + (payments._sum.amount?.toNumber() ?? 0);
  await tx.order.update({ where: { id: orderId }, data: { paid_total: paid } });

  if (order.enquiry_id) {
    const completed = order.status !== "cancelled" && isFullyPaid(paid, order.amount.toNumber());
    await tx.enquiry.updateMany({
      where: { id: order.enquiry_id, status: { in: ["order_created", "completed"] } },
      data: { status: completed ? "completed" : "order_created" },
    });
  }
}
