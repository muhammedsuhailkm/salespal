import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { literal } from "@/lib/list-params";
import { clientScopeWhere, getManagerOrgIds, getManagerSalesmanIds, getManagerSalesmanIdsForOrg, getSalesmanOrgIds, getTokenUserId, isRole } from "@/lib/scoping";
import { normalizeCrNo, parseCrExpiryDate } from "@/lib/client-fields";
import { canSetStatus, isClientStatus } from "@/lib/client-status-flow";
import { cleanText, contactRequiredMessage, missingContactFields, statusRequiresContact } from "@/lib/client-contact";

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
  // ?team=1 (managers): only their salesmen's clients — the same rule as the manager client page.
  const team: Prisma.ClientWhereInput =
    url.searchParams.get("team") && isRole(token, 2) ? { assigned_salesman_id: { in: await getManagerSalesmanIds(getTokenUserId(token)) } } : {};
  // ?details=1 adds status and salesman for richer result rows (client switcher).
  const details = !!url.searchParams.get("details");
  const clients = await prisma.client.findMany({
    where: { AND: [await clientScopeWhere(token), team, search] },
    select: { id: true, name: true, ...(details ? { status: true, assignedSalesman: { select: { name: true } } } : {}) },
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

  // Only Name is required for a Lead; contact details become required past Lead.
  const status = body.status ?? "lead";
  if (!isClientStatus(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  if (!canSetStatus(Number(token.role_id), "lead", status)) {
    return NextResponse.json({ error: "Only managers can add a client to the black list" }, { status: 403 });
  }
  const contactPersonName = cleanText(body.contact_person_name) ?? "";
  const contactNo = cleanText(body.contact_no) ?? "";
  const designation = cleanText(body.contact_person_designation) || null;
  const mailId = cleanText(body.mail_id) || null;
  if (!cleanText(body.name)) return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  const missing = statusRequiresContact(status)
    ? missingContactFields({ contact_person_name: contactPersonName, contact_no: contactNo, contact_person_designation: designation })
    : [];
  if (missing.length) {
    return NextResponse.json({ error: contactRequiredMessage(missing), code: "CONTACT_REQUIRED", missing }, { status: 422 });
  }

  // Duplicate check only on details that were actually entered
  const duplicateKeys = [contactNo ? { contact_no: contactNo } : null, mailId ? { mail_id: mailId } : null].filter(
    (k): k is { contact_no: string } | { mail_id: string } => k !== null
  );
  if (duplicateKeys.length) {
    const duplicate = await prisma.client.findFirst({ where: { OR: duplicateKeys } });
    if (duplicate) return NextResponse.json({ error: "Duplicate client", duplicate }, { status: 409 });
  }

  // The company must be one the user works for: a salesman's assigned companies, a manager's companies.
  // With a single company it's picked automatically; with several the form has to say which.
  const allowedOrgIds = token.role_id === 3 ? await getSalesmanOrgIds(getTokenUserId(token)) : token.role_id === 2 ? await getManagerOrgIds(getTokenUserId(token)) : [];
  let orgId = body.org_id ? Number(body.org_id) : null;
  if (!orgId && allowedOrgIds.length === 1) orgId = allowedOrgIds[0];
  if (!orgId) {
    return NextResponse.json(
      { error: allowedOrgIds.length ? "Select the company this client belongs to" : "You aren't assigned to a company yet", code: "ORG_REQUIRED" },
      { status: 400 }
    );
  }
  if (!allowedOrgIds.includes(orgId)) {
    return NextResponse.json({ error: "You don't work for that company" }, { status: 403 });
  }

  // A manager assigning the client to a salesman: that salesman must work for this company on their team.
  const assignedSalesmanId = Number(body.assigned_salesman_id ?? token.id);
  if (token.role_id === 2 && assignedSalesmanId !== getTokenUserId(token)) {
    if (!(await getManagerSalesmanIdsForOrg(getTokenUserId(token), orgId)).includes(assignedSalesmanId)) {
      return NextResponse.json({ error: "That salesman doesn't work for this company on your team" }, { status: 403 });
    }
  }

  let client;
  try {
    client = await prisma.client.create({
      data: {
        name: cleanText(body.name)!,
        contact_person_name: contactPersonName,
        contact_no: contactNo,
        location_coordinates: body.location_coordinates,
        mail_id: mailId,
        cr_no: crNo ?? null,
        cr_expiry_date: crExpiry.value ?? null,
        contact_person_designation: designation,
        assigned_salesman_id: assignedSalesmanId,
        org_id: orgId,
        notes: body.notes,
        status,
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
