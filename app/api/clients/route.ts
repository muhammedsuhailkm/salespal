import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { literal } from "@/lib/list-params";
import { clientScopeWhere, isRole } from "@/lib/scoping";
import { normalizeCrNo, parseCrExpiryDate } from "@/lib/client-fields";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Lightweight search for pickers: ?q=&limit= (max 50) → [{ id, name }]. Never returns the whole table.
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 50);
  const search: Prisma.ClientWhereInput = q
    ? {
        OR: [
          { name: { contains: literal(q), mode: "insensitive" } },
          { cr_no: { contains: literal(q), mode: "insensitive" } },
          { contact_no: { contains: literal(q) } },
        ],
      }
    : {};
  const clients = await prisma.client.findMany({
    where: { AND: [await clientScopeWhere(token), search] },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: limit,
  });
  return NextResponse.json({ clients });
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, [1, 2, 3])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const crNo = normalizeCrNo(body.cr_no);
  const crExpiry = parseCrExpiryDate(body.cr_expiry_date);
  if ((body.cr_no !== undefined && crNo === undefined) || !crExpiry.valid) {
    return NextResponse.json({ error: "Invalid CR number or expiry date" }, { status: 400 });
  }

  if (crNo) {
    const duplicateCr = await prisma.client.findUnique({ where: { cr_no: crNo } });
    if (duplicateCr) return NextResponse.json({ error: "CR number already exists" }, { status: 409 });
  }

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

  let client;
  try {
    client = await prisma.client.create({
      data: {
        name: body.name,
        contact_person_name: body.contact_person_name,
        contact_no: body.contact_no,
        location_coordinates: body.location_coordinates,
        mail_id: body.mail_id,
        cr_no: crNo ?? null,
        cr_expiry_date: crExpiry.value ?? null,
        contact_person_designation: body.contact_person_designation,
        assigned_salesman_id: Number(body.assigned_salesman_id ?? token.id),
        org_id: orgId,
        notes: body.notes,
        status: body.status ?? "lead",
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "CR number already exists" }, { status: 409 });
    }
    throw error;
  }
  revalidateTag("salesman-dashboard", { expire: 0 });
  revalidateTag("salesman-clients", { expire: 0 });
  revalidateTag("admin-clients", { expire: 0 });
  revalidateTag("manager-dashboard", { expire: 0 });
  revalidateTag("manager-clients", { expire: 0 });
  return NextResponse.json({ client }, { status: 201 });
}
