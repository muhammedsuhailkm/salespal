import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { orderPaymentsInclude, serializeOrder } from "@/lib/order-serialize";
import { getTokenUserId, orderScopeWhere } from "@/lib/scoping";
import { FlowError, updateOrderDetails } from "@/lib/enquiry-flow";
import { parseDateOnly } from "@/lib/salesman-targets";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const order = await prisma.order.findFirst({
    where: { AND: [{ id: Number(id) }, await orderScopeWhere(token)] },
    include: { client: { select: { id: true, name: true } }, createdBy: { select: { name: true } }, ...orderPaymentsInclude },
  });
  if (!order) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ order: serializeOrder(order) });
}

/** Accounts fill in job no, actual cost / profit, invoice date and due date (lib/enquiry-flow.ts). */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const scoped = await prisma.order.findFirst({ where: { AND: [{ id: Number(id) }, await orderScopeWhere(token)] }, select: { id: true } });
  if (!scoped) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  try {
    await updateOrderDetails(scoped.id, body, { id: getTokenUserId(token), role_id: Number(token.role_id) }, parseDateOnly);
  } catch (error) {
    if (error instanceof FlowError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
  const order = await prisma.order.findUniqueOrThrow({ where: { id: scoped.id }, include: orderPaymentsInclude });
  return NextResponse.json({ order: serializeOrder(order) });
}
