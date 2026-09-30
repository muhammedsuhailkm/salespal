import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere, getTokenUserId, isRole } from "@/lib/scoping";
import { parseDateOnly } from "@/lib/salesman-targets";
import { getEnquiries, revalidateEnquiryPages } from "@/lib/enquiries";
import { enquiryModes, enquiryPaymentModes, enquiryTerms } from "@/types/enquiry";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ enquiries: await getEnquiries(token) });
}

const ONBOARDED_OR_BEYOND = ["onboarded", "active_client"];

/** Salesmen and managers raise enquiries with a provisional cost and profit. */
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, [2, 3])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const clientId = Number(body.client_id);
  const enquiryDate = parseDateOnly(body.enquiry_date);
  const from = String(body.from ?? "").trim();
  const to = String(body.to ?? "").trim();
  const cost = Number(body.provisional_cost);
  const profit = Number(body.provisional_profit);
  const creditDays = body.payment_mode === "credit" ? Number(body.credit_days) : null;

  if (!Number.isInteger(clientId)) return NextResponse.json({ error: "Select a client" }, { status: 400 });
  if (!enquiryDate) return NextResponse.json({ error: "Invalid enquiry date" }, { status: 400 });
  if (!enquiryModes.includes(body.mode)) return NextResponse.json({ error: "Invalid mode of transport" }, { status: 400 });
  if (!from || !to) return NextResponse.json({ error: "From and To are required" }, { status: 400 });
  if (!enquiryTerms.includes(body.term)) return NextResponse.json({ error: "Invalid term" }, { status: 400 });
  if (!enquiryPaymentModes.includes(body.payment_mode)) return NextResponse.json({ error: "Invalid payment mode" }, { status: 400 });
  if (creditDays !== null && (!Number.isInteger(creditDays) || creditDays <= 0)) {
    return NextResponse.json({ error: "Credit days must be a whole number above 0" }, { status: 400 });
  }
  if (!Number.isFinite(cost) || cost < 0) return NextResponse.json({ error: "Invalid cost" }, { status: 400 });
  if (!Number.isFinite(profit)) return NextResponse.json({ error: "Invalid profit" }, { status: 400 });

  const client = await prisma.client.findFirst({
    where: { AND: [{ id: clientId }, await clientScopeWhere(token)] },
    select: { id: true, status: true, assigned_salesman_id: true },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Raising an enquiry onboards the client (unless already onboarded / active).
  // Mirrors a manual status change: client log + salesman KPI log.
  const onboard = !ONBOARDED_OR_BEYOND.includes(client.status);

  const enquiry = await prisma.$transaction(async (tx) => {
    const created = await tx.enquiry.create({
      data: {
        client_id: clientId,
        enquiry_date: enquiryDate,
        mode: body.mode,
        from,
        to,
        term: body.term,
        payment_mode: body.payment_mode,
        credit_days: creditDays,
        clearance: Boolean(body.clearance),
        provisional_cost: cost,
        provisional_profit: profit,
        notes: body.notes ? String(body.notes).trim() || null : null,
        created_by_id: getTokenUserId(token),
      },
    });
    if (onboard) {
      await tx.client.update({ where: { id: client.id }, data: { status: "onboarded" } });
      await tx.clientLog.create({
        data: { client_id: client.id, action: "Status changed to onboarded", done_by: getTokenUserId(token) },
      });
      await tx.salesmanKpiLog.create({ data: { salesman_id: client.assigned_salesman_id, action: "onboarded" } });
    }
    return created;
  });

  revalidateEnquiryPages();
  if (onboard) {
    revalidateTag("salesman-dashboard", { expire: 0 });
    revalidateTag("salesman-clients", { expire: 0 });
    revalidateTag("admin-clients", { expire: 0 });
    revalidateTag("manager-dashboard", { expire: 0 });
    revalidateTag("manager-clients", { expire: 0 });
  }
  return NextResponse.json({ enquiry: { id: enquiry.id }, client_onboarded: onboard }, { status: 201 });
}
