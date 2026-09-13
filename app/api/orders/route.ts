import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { isRole, orderScopeWhere } from "@/lib/scoping";
import { orderModes, orderPaymentModes } from "@/types/order";

function serializeOrder<T extends { amount: { toNumber(): number }; advance_amount: { toNumber(): number } }>(order: T) {
  const amount = order.amount.toNumber();
  const advance_amount = order.advance_amount.toNumber();
  return { ...order, amount, advance_amount, balance: amount - advance_amount };
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: await orderScopeWhere(token),
    include: { client: { select: { id: true, name: true } }, createdBy: { select: { name: true } } },
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json({ orders: orders.map(serializeOrder) });
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, 3)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  if (!orderModes.includes(body.mode)) return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  if (!orderPaymentModes.includes(body.payment_mode)) return NextResponse.json({ error: "Invalid payment mode" }, { status: 400 });
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  const advanceAmount = Number(body.advance_amount ?? 0);
  if (!Number.isFinite(advanceAmount) || advanceAmount < 0) return NextResponse.json({ error: "Invalid advance amount" }, { status: 400 });
  if (advanceAmount > amount) return NextResponse.json({ error: "Advance amount cannot exceed the order amount" }, { status: 400 });

  const client = await prisma.client.findFirst({
    where: { id: Number(body.client_id), assigned_salesman_id: Number(token.id) },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const order = await prisma.order.create({
    data: {
      client_id: client.id,
      mode: body.mode,
      description: body.description,
      payment_mode: body.payment_mode,
      amount,
      advance_amount: advanceAmount,
      from: body.from,
      to: body.to,
      status: "draft",
      accounts_approval: "pending",
      manager_approval: "pending",
      created_by_id: Number(token.id),
    },
  });

  revalidateTag("salesman-orders", { expire: 0 });
  revalidateTag("manager-orders", { expire: 0 });
  revalidateTag("accountant-orders", { expire: 0 });
  revalidateTag("order-stats", { expire: 0 });
  return NextResponse.json({ order: serializeOrder(order) }, { status: 201 });
}
