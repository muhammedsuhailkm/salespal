import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/scoping";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const logs = await prisma.clientLog.findMany({ where: { client: await clientScopeWhere(token) }, include: { author: { select: { name: true } }, client: { select: { name: true } } }, orderBy: { created_at: "desc" }, take: 20 });
  return NextResponse.json({ logs });
}
