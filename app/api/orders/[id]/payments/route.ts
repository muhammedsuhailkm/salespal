import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getTokenUserId, isRole, orderScopeWhere } from "@/lib/scoping";
import { parseDateOnly } from "@/lib/salesman-targets";
import { revalidateEnquiryPages } from "@/lib/enquiries";
import { orderPaymentMethods } from "@/types/order";

/** Accountants record a payment collected against an order. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, 4)) return NextResponse.json({ error: "Only accountants can record payments" }, { status: 403 });

  const { id } = await context.params;
  const body = await request.json();
  const amount = Number(body.amount);
  const paidOn = parseDateOnly(body.paid_on);

  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Payment amount must be greater than 0" }, { status: 400 });
  if (!paidOn) return NextResponse.json({ error: "Invalid payment date" }, { status: 400 });
  if (!orderPaymentMethods.includes(body.method)) return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });

  const order = await prisma.order.findFirst({
    where: { AND: [{ id: Number(id) }, await orderScopeWhere(token)] },
    include: { payments: { select: { amount: true } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status === "cancelled") return NextResponse.json({ error: "Cannot record a payment on a cancelled order" }, { status: 409 });

  const paid = order.advance_amount.toNumber() + order.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
  const balance = order.amount.toNumber() - paid;
  if (amount > balance + 0.001) {
    return NextResponse.json({ error: `Payment exceeds the balance due (${balance.toFixed(2)})` }, { status: 400 });
  }

  const payment = await prisma.orderPayment.create({
    data: {
      order_id: order.id,
      amount,
      paid_on: paidOn,
      method: body.method,
      reference: body.reference ? String(body.reference).trim() || null : null,
      notes: body.notes ? String(body.notes).trim() || null : null,
      recorded_by_id: getTokenUserId(token),
    },
  });

  revalidateTag("salesman-orders", { expire: 0 });
  revalidateTag("manager-orders", { expire: 0 });
  revalidateTag("accountant-orders", { expire: 0 });
  revalidateTag("order-stats", { expire: 0 });
  revalidatePath("/dashboard/salesman/orders");
  revalidatePath("/dashboard/manager/orders");
  revalidatePath("/dashboard/accountant/orders");
  revalidateEnquiryPages();
  return NextResponse.json({ payment: { id: payment.id } }, { status: 201 });
}
