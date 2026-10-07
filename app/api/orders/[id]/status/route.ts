import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getTokenUserId, orderScopeWhere } from "@/lib/scoping";
import { FlowError, applyOrderAction, type OrderAction } from "@/lib/enquiry-flow";

const ACTIONS: OrderAction[] = ["deliver", "complete", "request_revision", "cancel"];

/** Order status change: { action: deliver | complete | request_revision | cancel, reason? }. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  if (!ACTIONS.includes(body.action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const scoped = await prisma.order.findFirst({ where: { AND: [{ id: Number(id) }, await orderScopeWhere(token)] }, select: { id: true } });
  if (!scoped) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  try {
    await applyOrderAction(scoped.id, body.action, body, { id: getTokenUserId(token), role_id: Number(token.role_id) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof FlowError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
