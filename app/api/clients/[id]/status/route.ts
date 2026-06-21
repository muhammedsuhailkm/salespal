import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/scoping";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json();
  const scoped = await prisma.client.findFirst({ where: { AND: [{ id: Number(id) }, await clientScopeWhere(token)] } });
  if (!scoped) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const client = await prisma.client.update({ where: { id: Number(id) }, data: { status: body.status } });
  await prisma.clientLog.create({ data: { client_id: client.id, action: `Status changed to ${body.status}`, done_by: Number(token.id) } });
  await prisma.salesmanKpiLog.create({ data: { salesman_id: client.assigned_salesman_id, action: body.status } });
  return NextResponse.json({ client });
}
