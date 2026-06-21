import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isRole } from "@/lib/scoping";

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, 2)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const password = await bcrypt.hash(body.password ?? "password123", 10);
  const user = await prisma.user.create({ data: { name: body.name, role_id: 3, email: String(body.email).toLowerCase(), password, phone: body.phone } });
  await prisma.managerSalesman.create({ data: { manager_id: Number(token.id), salesman_id: user.id } });
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role_id: user.role_id } }, { status: 201 });
}
