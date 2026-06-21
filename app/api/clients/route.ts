import { NextResponse, type NextRequest } from "next/server";
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

  const client = await prisma.client.create({
    data: {
      name: body.name,
      contact_person_name: body.contact_person_name,
      contact_no: body.contact_no,
      location_coordinates: body.location_coordinates,
      mail_id: body.mail_id,
      contact_person_designation: body.contact_person_designation,
      assigned_salesman_id: Number(body.assigned_salesman_id ?? token.id),
      org_id: Number(body.org_id),
      notes: body.notes,
      status: body.status ?? "new_lead",
    },
  });
  return NextResponse.json({ client }, { status: 201 });
}
