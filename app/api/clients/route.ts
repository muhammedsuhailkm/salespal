import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere, isRole } from "@/lib/scoping";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clients = await prisma.client.findMany({ where: await clientScopeWhere(token), include: { organization: { select: { name: true } }, assignedSalesman: { select: { name: true } } }, orderBy: { id: "desc" } });
  return NextResponse.json({ clients });
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, [1, 2, 3])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const duplicate = await prisma.client.findFirst({ where: { OR: [{ contact_no: body.contact_no }, { mail_id: body.mail_id ?? "" }] } });
  if (duplicate) return NextResponse.json({ error: "Duplicate client", duplicate }, { status: 409 });

  let orgId = body.org_id ? Number(body.org_id) : null;
  if (!orgId) {
    if (token.role_id === 3) {
      const managerSalesman = await prisma.managerSalesman.findFirst({
        where: { salesman_id: Number(token.id) },
        include: { manager: { include: { managerOrgs: true } } }
      });
      orgId = managerSalesman?.manager?.managerOrgs?.[0]?.org_id ?? null;
    } else if (token.role_id === 2) {
      const managerOrg = await prisma.managerOrg.findFirst({
        where: { manager_id: Number(token.id) }
      });
      orgId = managerOrg?.org_id ?? null;
    }
  }

  if (!orgId) {
    return NextResponse.json({ error: "Organization not found for the user" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      name: body.name,
      contact_person_name: body.contact_person_name,
      contact_no: body.contact_no,
      location_coordinates: body.location_coordinates,
      mail_id: body.mail_id,
      contact_person_designation: body.contact_person_designation,
      assigned_salesman_id: Number(body.assigned_salesman_id ?? token.id),
      org_id: orgId,
      notes: body.notes,
      status: body.status ?? "new_lead",
    },
  });
  revalidateTag("salesman-dashboard");
  revalidateTag("salesman-clients");
  return NextResponse.json({ client }, { status: 201 });
}
