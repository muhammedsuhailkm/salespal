import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { isRole, taskScopeWhere } from "@/lib/scoping";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await prisma.task.findMany({ where: await taskScopeWhere(token), include: { assignedTo: { select: { name: true } }, createdBy: { select: { name: true } } }, orderBy: { due_date: "asc" } });
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, [1, 2, 3])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const assignedToId = token.role_id === 3 ? Number(token.id) : Number(body.assigned_to_id);

  const task = await prisma.task.create({
    data: {
      assigned_to_id: assignedToId,
      created_by_id: Number(token.id),
      description: body.description,
      due_date: new Date(body.due_date),
      notification: Boolean(body.notification),
      status: body.status ?? "pending"
    }
  });
  revalidateTag("salesman-dashboard");
  revalidateTag("salesman-tasks");
  return NextResponse.json({ task }, { status: 201 });
}
