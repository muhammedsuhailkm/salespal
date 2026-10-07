import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/scoping";
import { normalizeCrNo, parseCrExpiryDate } from "@/lib/client-fields";
import { canSetStatus, isClientStatus } from "@/lib/client-status-flow";
import { cleanText, contactRequiredMessage, missingContactFields, statusRequiresContact } from "@/lib/client-contact";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const client = await prisma.client.findFirst({
    where: { AND: [{ id: Number(id) }, await clientScopeWhere(token)] },
    include: {
      logs: {
        include: { author: { select: { name: true } } },
        orderBy: { created_at: "desc" },
        take: 50,
      },
      organization: true,
      assignedSalesman: { select: { name: true } },
    },
  });
  if (!client) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ client });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json();

  const scoped = await prisma.client.findFirst({ where: { AND: [{ id: Number(id) }, await clientScopeWhere(token)] } });
  if (!scoped) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const crNo = normalizeCrNo(body.cr_no);
  const crExpiry = parseCrExpiryDate(body.cr_expiry_date);
  if ((body.cr_no !== undefined && crNo === undefined) || !crExpiry.valid) {
    return NextResponse.json({ error: "Invalid CR number or expiry date" }, { status: 400 });
  }

  if (crNo) {
    const duplicateCr = await prisma.client.findFirst({
      where: { cr_no: crNo, id: { not: Number(id) } },
      select: { id: true },
    });
    if (duplicateCr) return NextResponse.json({ error: "CR number already exists" }, { status: 409 });
  }

  if (body.status !== undefined) {
    if (!isClientStatus(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    if (!canSetStatus(Number(token.role_id), scoped.status, body.status)) {
      return NextResponse.json({ error: "Only managers can change the black list" }, { status: 403 });
    }
  }

  // Contact details can't be blank on a client past Lead (checked against the values after this update)
  const nextStatus = body.status ?? scoped.status;
  if (statusRequiresContact(nextStatus)) {
    const pick = (key: "contact_person_name" | "contact_no" | "contact_person_designation") =>
      body[key] !== undefined ? cleanText(body[key]) : scoped[key];
    const missing = missingContactFields({
      contact_person_name: pick("contact_person_name"),
      contact_no: pick("contact_no"),
      contact_person_designation: pick("contact_person_designation"),
    });
    if (missing.length) {
      return NextResponse.json({ error: contactRequiredMessage(missing), code: "CONTACT_REQUIRED", missing }, { status: 422 });
    }
  }

  // Check duplicate contact details for other clients
  if (body.contact_no || body.mail_id) {
    const duplicate = await prisma.client.findFirst({
      where: {
        AND: [
          { id: { not: Number(id) } },
          {
            OR: [
              body.contact_no ? { contact_no: body.contact_no } : undefined,
              body.mail_id ? { mail_id: body.mail_id } : undefined,
            ].filter(Boolean) as any,
          },
        ],
      },
    });
    if (duplicate) {
      return NextResponse.json({ error: "Duplicate client details" }, { status: 409 });
    }
  }

  try {
    const client = await prisma.$transaction(async (tx) => {
      const updatedClient = await tx.client.update({
        where: { id: Number(id) },
        data: {
          name: body.name ?? undefined,
          contact_person_name: body.contact_person_name !== undefined ? cleanText(body.contact_person_name) : undefined,
          contact_person_designation:
            body.contact_person_designation !== undefined ? cleanText(body.contact_person_designation) || null : undefined,
          mail_id: body.mail_id ?? undefined,
          cr_no: body.cr_no !== undefined ? crNo ?? null : undefined,
          cr_expiry_date: crExpiry.value,
          contact_no: body.contact_no !== undefined ? cleanText(body.contact_no) : undefined,
          status: body.status ?? undefined,
          notes: body.notes !== undefined ? body.notes : undefined,
          location_coordinates: body.location_coordinates !== undefined ? body.location_coordinates : undefined,
        },
      });

      await tx.clientLog.create({
        data: {
          client_id: updatedClient.id,
          action: `Client details updated: ${body.name || updatedClient.name}`,
          done_by: Number(token.id),
        },
      });

      if (body.status && body.status !== scoped.status) {
        await tx.clientLog.create({
          data: {
            client_id: updatedClient.id,
            action: `Status changed to ${body.status}`,
            done_by: Number(token.id),
          },
        });
        await tx.salesmanKpiLog.create({
          data: {
            salesman_id: updatedClient.assigned_salesman_id,
            action: body.status,
          },
        });
      }

      return updatedClient;
    });

    revalidateTag("salesman-dashboard", { expire: 0 });
    revalidateTag("salesman-clients", { expire: 0 });
    revalidateTag("admin-clients", { expire: 0 });
    revalidateTag("manager-dashboard", { expire: 0 });
    revalidateTag("manager-clients", { expire: 0 });
    return NextResponse.json({ client });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "CR number already exists" }, { status: 409 });
    }
    console.error("Client update transaction error:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}
