import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/scoping";
import { canSetStatus, isClientStatus } from "@/lib/client-status-flow";
import { cleanText, contactRequiredMessage, missingContactFields, statusRequiresContact } from "@/lib/client-contact";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json();
  const scoped = await prisma.client.findFirst({ where: { AND: [{ id: Number(id) }, await clientScopeWhere(token)] } });
  if (!scoped) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isClientStatus(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  if (!canSetStatus(Number(token.role_id), scoped.status, body.status)) {
    return NextResponse.json({ error: "Only managers can change the black list" }, { status: 403 });
  }

  // Moving past Lead needs contact details. They can be sent with the status change.
  const contact = {
    contact_person_name: cleanText(body.contact_person_name),
    contact_no: cleanText(body.contact_no),
    contact_person_designation: cleanText(body.contact_person_designation),
  };
  const sentContact = Object.values(contact).some((v) => v !== undefined);
  if (statusRequiresContact(body.status)) {
    const missing = missingContactFields({
      contact_person_name: contact.contact_person_name ?? scoped.contact_person_name,
      contact_no: contact.contact_no ?? scoped.contact_no,
      contact_person_designation: contact.contact_person_designation ?? scoped.contact_person_designation,
    });
    if (missing.length) {
      return NextResponse.json({ error: contactRequiredMessage(missing), code: "CONTACT_REQUIRED", missing }, { status: 422 });
    }
  }
  if (contact.contact_no) {
    const duplicate = await prisma.client.findFirst({ where: { contact_no: contact.contact_no, id: { not: scoped.id } }, select: { id: true } });
    if (duplicate) return NextResponse.json({ error: "Another client already has this phone number" }, { status: 409 });
  }

  try {
    const client = await prisma.$transaction(async (tx) => {
      const updatedClient = await tx.client.update({
        where: { id: Number(id) },
        data: {
          status: body.status,
          ...(sentContact && {
            contact_person_name: contact.contact_person_name ?? undefined,
            contact_no: contact.contact_no ?? undefined,
            contact_person_designation: contact.contact_person_designation || undefined,
          }),
        },
      });

      if (sentContact) {
        await tx.clientLog.create({
          data: { client_id: updatedClient.id, action: "Contact details added", done_by: Number(token.id) },
        });
      }

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

      return updatedClient;
    });

    revalidateTag("salesman-dashboard", { expire: 0 });
    revalidateTag("salesman-clients", { expire: 0 });
    revalidateTag("admin-clients", { expire: 0 });
    revalidateTag("manager-dashboard", { expire: 0 });
    revalidateTag("manager-clients", { expire: 0 });
    return NextResponse.json({ client });
  } catch (error) {
    console.error("Status update transaction error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
