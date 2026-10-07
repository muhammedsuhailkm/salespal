import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getManagerOrgIds, isRole } from "@/lib/scoping";
import { setSalesmanCompanies, TeamAssignmentError } from "@/lib/team-assignments";

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, 2)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const email = String(body.email || "").toLowerCase().trim();
  if (!email || !body.name) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  // Companies the salesman works for: body.org_ids (must be the manager's), defaulting to the manager's only company.
  const managerOrgs = await getManagerOrgIds(Number(token.id));
  const orgIds: number[] = Array.isArray(body.org_ids) && body.org_ids.length ? body.org_ids.map(Number) : managerOrgs.length === 1 ? managerOrgs : [];
  if (orgIds.length === 0) return NextResponse.json({ error: "Pick at least one company (org_ids)" }, { status: 400 });

  const password = await bcrypt.hash(body.password ?? "password123", 10);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: body.name,
          role_id: 3,
          email,
          password,
          phone: body.phone || null,
        },
      });

      await setSalesmanCompanies(Number(token.id), newUser.id, orgIds, tx);

      return newUser;
    });

    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email, role_id: user.role_id } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof TeamAssignmentError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Salesman creation transaction error:", error);
    return NextResponse.json({ error: "Failed to create salesman" }, { status: 500 });
  }
}
