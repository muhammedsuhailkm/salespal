import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getTokenUserId, isRole } from "@/lib/scoping";
import { orderPaymentsInclude, serializeOrder } from "@/lib/order-serialize";

/** Accountant reminds the order's salesman to collect an outstanding payment (creates a task for them). */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, 4)) return NextResponse.json({ error: "Only accountants can send payment reminders" }, { status: 403 });

  const { id } = await context.params;
  const raw = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: { client: { select: { name: true } }, createdBy: { select: { name: true } }, ...orderPaymentsInclude },
  });
  if (!raw || raw.status === "cancelled") return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const order = serializeOrder(raw);
  if (order.balance <= 0) return NextResponse.json({ error: "This order is fully paid" }, { status: 409 });

  const ref = `#${String(order.id).padStart(5, "0")}${raw.job_no ? ` (Job ${raw.job_no})` : ""}`;
  await prisma.task.create({
    data: {
      assigned_to_id: raw.created_by_id,
      created_by_id: getTokenUserId(token),
      description: `Payment reminder: collect ${order.balance.toFixed(2)} outstanding from ${raw.client.name} for order ${ref}`,
      due_date: new Date(),
      notification: true,
      status: "pending",
    },
  });

  revalidateTag("salesman-dashboard", { expire: 0 });
  revalidateTag("salesman-tasks", { expire: 0 });
  revalidateTag("manager-dashboard", { expire: 0 });
  revalidateTag("manager-tasks", { expire: 0 });
  return NextResponse.json({ ok: true, salesman: raw.createdBy.name }, { status: 201 });
}
