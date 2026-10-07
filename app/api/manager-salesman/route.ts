import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSalesPalSession } from "@/lib/auth";
import { assignSalesmanToCompany, revalidateTeamViews, TeamAssignmentError, unassignSalesman } from "@/lib/team-assignments";

/** Owner: put a salesman on a manager's team for one company ({ managerId, salesmanId, orgId }). */
export async function POST(req: Request) {
  const session = await getSalesPalSession();
  if (!session || session.user.role_id !== 1) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const managerId = Number(body.managerId);
  const salesmanId = Number(body.salesmanId);
  const orgId = Number(body.orgId);
  if (![managerId, salesmanId, orgId].every(Number.isInteger)) {
    return NextResponse.json({ error: "Manager, salesman and company are required" }, { status: 400 });
  }

  const salesman = await prisma.user.findFirst({ where: { id: salesmanId, role_id: 3 }, select: { id: true } });
  if (!salesman) return NextResponse.json({ error: "Salesman not found" }, { status: 404 });

  try {
    await assignSalesmanToCompany(managerId, salesmanId, orgId);
  } catch (error) {
    if (error instanceof TeamAssignmentError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }

  revalidateTeamViews();
  return NextResponse.json({ success: true });
}

/** Owner: take a salesman off a manager's team — for one company with ?orgId=, otherwise for all of them. */
export async function DELETE(req: Request) {
  const session = await getSalesPalSession();
  if (!session || session.user.role_id !== 1) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const managerId = Number(url.searchParams.get("managerId"));
  const salesmanId = Number(url.searchParams.get("salesmanId"));
  const orgParam = url.searchParams.get("orgId");
  const orgId = orgParam ? Number(orgParam) : undefined;
  if (!Number.isInteger(managerId) || !Number.isInteger(salesmanId) || (orgId !== undefined && !Number.isInteger(orgId))) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  await unassignSalesman(managerId, salesmanId, orgId);
  revalidateTeamViews();
  return NextResponse.json({ success: true });
}
