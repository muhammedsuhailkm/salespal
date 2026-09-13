import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { orderScopeWhere } from "@/lib/scoping";
import { orderModes, orderPaymentModes } from "@/types/order";

function serializeOrder<T extends { amount: { toNumber(): number }; advance_amount: { toNumber(): number } }>(order: T) {
  const amount = order.amount.toNumber();
  const advance_amount = order.advance_amount.toNumber();
  return { ...order, amount, advance_amount, balance: amount - advance_amount };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const order = await prisma.order.findFirst({
    where: { AND: [{ id: Number(id) }, await orderScopeWhere(token)] },
    include: { client: { select: { id: true, name: true } }, createdBy: { select: { name: true } } },
  });
  if (!order) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ order: serializeOrder(order) });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const scoped = await prisma.order.findFirst({ where: { AND: [{ id: Number(id) }, await orderScopeWhere(token)] } });
  if (!scoped) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (scoped.status !== "draft") return NextResponse.json({ error: "Only draft orders can be edited" }, { status: 409 });

  const body = await request.json();
  if (body.mode && !orderModes.includes(body.mode)) return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  if (body.payment_mode && !orderPaymentModes.includes(body.payment_mode)) return NextResponse.json({ error: "Invalid payment mode" }, { status: 400 });
  if (body.amount !== undefined && (!Number.isFinite(Number(body.amount)) || Number(body.amount) < 0)) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (body.advance_amount !== undefined && (!Number.isFinite(Number(body.advance_amount)) || Number(body.advance_amount) < 0)) {
    return NextResponse.json({ error: "Invalid advance amount" }, { status: 400 });
  }

  const effectiveAmount = body.amount !== undefined ? Number(body.amount) : scoped.amount.toNumber();
  const effectiveAdvance = body.advance_amount !== undefined ? Number(body.advance_amount) : scoped.advance_amount.toNumber();
  if (effectiveAdvance > effectiveAmount) {
    return NextResponse.json({ error: "Advance amount cannot exceed the order amount" }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id: Number(id) },
    data: {
      mode: body.mode ?? undefined,
      description: body.description ?? undefined,
      payment_mode: body.payment_mode ?? undefined,
      amount: body.amount !== undefined ? effectiveAmount : undefined,
      advance_amount: body.advance_amount !== undefined ? effectiveAdvance : undefined,
      from: body.from ?? undefined,
      to: body.to ?? undefined,
    },
  });

  revalidateTag("salesman-orders", { expire: 0 });
  revalidateTag("manager-orders", { expire: 0 });
  revalidateTag("accountant-orders", { expire: 0 });
  revalidateTag("order-stats", { expire: 0 });
  return NextResponse.json({ order: serializeOrder(order) });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const scoped = await prisma.order.findFirst({ where: { AND: [{ id: Number(id) }, await orderScopeWhere(token)] } });
  if (!scoped) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (scoped.status !== "draft") return NextResponse.json({ error: "Only draft orders can be deleted" }, { status: 409 });

  await prisma.order.delete({ where: { id: Number(id) } });

  revalidateTag("salesman-orders", { expire: 0 });
  revalidateTag("manager-orders", { expire: 0 });
  revalidateTag("accountant-orders", { expire: 0 });
  revalidateTag("order-stats", { expire: 0 });
  return NextResponse.json({ ok: true });
}
