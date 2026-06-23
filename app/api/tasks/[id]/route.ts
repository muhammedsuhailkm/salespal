import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { isRole, taskScopeWhere } from "@/lib/scoping";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const scoped = await prisma.task.findFirst({ where: { AND: [{ id: Number(id) }, await taskScopeWhere(token)] } });
  if (!scoped) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const task = await prisma.task.update({ where: { id: Number(id) }, data: { status: body.status ?? scoped.status, due_date: body.due_date ? new Date(body.due_date) : scoped.due_date, description: body.description ?? scoped.description } });
  revalidateTag("salesman-dashboard", { expire: 0 });
  revalidateTag("salesman-tasks", { expire: 0 });
  return NextResponse.json({ task });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, [1, 2])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const scoped = await prisma.task.findFirst({ where: { AND: [{ id: Number(id) }, await taskScopeWhere(token)] } });
  if (!scoped) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.task.delete({ where: { id: Number(id) } });
  revalidateTag("salesman-dashboard", { expire: 0 });
  revalidateTag("salesman-tasks", { expire: 0 });
  return NextResponse.json({ ok: true });
}
