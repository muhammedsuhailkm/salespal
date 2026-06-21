import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/scoping";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const client = await prisma.client.findFirst({ where: { AND: [{ id: Number(id) }, await clientScopeWhere(token)] }, include: { logs: { include: { author: { select: { name: true } } }, orderBy: { created_at: "desc" } }, organization: true, assignedSalesman: { select: { name: true } } } });
  if (!client) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ client });
}
