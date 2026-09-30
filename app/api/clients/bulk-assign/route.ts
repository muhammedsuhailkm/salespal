import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { canAccessSalesman, clientScopeWhere, getManagerOrgIds, getTokenUserId, isRole } from "@/lib/scoping";

/** Managers reassign several of their organization's clients to one salesman on their team, optionally under another of their companies. */
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, 2)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const salesmanId = Number(body.salesman_id);
  const clientIds: number[] = Array.isArray(body.client_ids) ? [...new Set<number>(body.client_ids.map(Number))] : [];

  if (!Number.isInteger(salesmanId)) return NextResponse.json({ error: "Invalid salesman" }, { status: 400 });
  if (clientIds.length === 0 || clientIds.some((id) => !Number.isInteger(id))) {
    return NextResponse.json({ error: "Select at least one client" }, { status: 400 });
  }
  if (!(await canAccessSalesman(token, salesmanId))) return NextResponse.json({ error: "Salesman is not on your team" }, { status: 403 });

  const salesman = await prisma.user.findFirst({ where: { id: salesmanId, role_id: 3 }, select: { name: true } });
  if (!salesman) return NextResponse.json({ error: "Salesman not found" }, { status: 404 });

  // Optional: move the clients to another company the manager is assigned to.
  let org: { id: number; name: string } | null = null;
  if (body.org_id !== undefined && body.org_id !== null && body.org_id !== "") {
    const orgId = Number(body.org_id);
    const managerOrgIds = await getManagerOrgIds(getTokenUserId(token));
    if (!Number.isInteger(orgId) || !managerOrgIds.includes(orgId)) {
      return NextResponse.json({ error: "Company is not assigned to you" }, { status: 403 });
    }
    org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true } });
    if (!org) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const clients = await prisma.client.findMany({
    where: { AND: [{ id: { in: clientIds } }, await clientScopeWhere(token)] },
    select: { id: true, assigned_salesman_id: true, org_id: true },
  });
  if (clients.length !== clientIds.length) return NextResponse.json({ error: "Some clients are outside your organization" }, { status: 403 });

  const toMove = clients
    .filter((client) => client.assigned_salesman_id !== salesmanId || (org && client.org_id !== org.id))
    .map((client) => client.id);
  const action = `Assigned to ${salesman.name}${org ? ` (${org.name})` : ""} for follow-up`;
  if (toMove.length) {
    await prisma.$transaction([
      prisma.client.updateMany({
        where: { id: { in: toMove } },
        data: { assigned_salesman_id: salesmanId, ...(org ? { org_id: org.id } : {}) },
      }),
      prisma.clientLog.createMany({
        data: toMove.map((id) => ({ client_id: id, action, done_by: getTokenUserId(token) })),
      }),
    ]);
  }

  revalidateTag("salesman-dashboard", { expire: 0 });
  revalidateTag("salesman-clients", { expire: 0 });
  revalidateTag("admin-clients", { expire: 0 });
  revalidateTag("manager-dashboard", { expire: 0 });
  revalidateTag("manager-clients", { expire: 0 });
  return NextResponse.json({ updated: toMove.length });
}
