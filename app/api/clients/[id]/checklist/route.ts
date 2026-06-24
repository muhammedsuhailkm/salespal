import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere } from "@/lib/scoping";

// Map key to user-friendly label for logs
const labelMap: Record<string, string> = {
  checklist_kyc_verified: "KYC Documents Verified",
  checklist_agreement_signed: "Business Agreement Signed",
  checklist_rate_card_approved: "Rate Card Approved",
  checklist_integration_setup: "Integration Setup Completed",
  checklist_dispatch_confirmed: "Dispatch Location Confirmed",
  checklist_billing_verified: "Billing & Credit Setup Verified",
  checklist_portal_created: "Customer Portal Account Created",
  checklist_first_shipment: "First Shipment Scheduled",
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json();
  const { key, value } = body;

  if (typeof key !== "string" || !key.startsWith("checklist_") || typeof value !== "boolean") {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const scoped = await prisma.client.findFirst({
    where: { AND: [{ id: Number(id) }, await clientScopeWhere(token)] },
  });
  if (!scoped) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Update client
  const client = await prisma.client.update({
    where: { id: Number(id) },
    data: { [key]: value },
  });

  const label = labelMap[key] || key;
  const actionText = value ? `Checked checklist: ${label}` : `Unchecked checklist: ${label}`;

  // Log action
  await prisma.clientLog.create({
    data: {
      client_id: client.id,
      action: actionText,
      done_by: Number(token.id),
    },
  });

  revalidateTag("salesman-dashboard", { expire: 0 });
  revalidateTag("salesman-clients", { expire: 0 });

  return NextResponse.json({ client });
}
