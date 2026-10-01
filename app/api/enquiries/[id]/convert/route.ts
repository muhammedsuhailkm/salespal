import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isRole } from "@/lib/scoping";
import { enquiryScopeWhere, revalidateEnquiryPages } from "@/lib/enquiries";
import { parseDateOnly } from "@/lib/salesman-targets";
import { enquiryRef } from "@/types/enquiry";
import { closeFollowUpTasks, revalidateTaskViews } from "@/lib/enquiry-follow-ups";
import { syncOrderPayments } from "@/lib/order-payments";

/**
 * Accountant converts an open enquiry into a draft order with the actual cost,
 * profit and job no. Order amount = actual cost + actual profit; the order then
 * follows the normal approval workflow.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRole(token, 4)) return NextResponse.json({ error: "Only accountants can convert enquiries" }, { status: 403 });

  const { id } = await context.params;
  const body = await request.json();
  const jobNo = String(body.job_no ?? "").trim().toUpperCase();
  const cost = Number(body.actual_cost);
  const profit = Number(body.actual_profit);
  const advance = body.advance_amount === undefined || body.advance_amount === "" ? 0 : Number(body.advance_amount);

  if (!jobNo) return NextResponse.json({ error: "Job no is required" }, { status: 400 });
  if (!Number.isFinite(cost) || cost < 0) return NextResponse.json({ error: "Invalid actual cost" }, { status: 400 });
  if (!Number.isFinite(profit)) return NextResponse.json({ error: "Invalid actual profit" }, { status: 400 });
  const amount = cost + profit;
  if (amount < 0) return NextResponse.json({ error: "Cost + profit cannot be negative" }, { status: 400 });
  if (!Number.isFinite(advance) || advance < 0) return NextResponse.json({ error: "Invalid advance amount" }, { status: 400 });
  if (advance > amount) return NextResponse.json({ error: "Advance amount cannot exceed the order amount" }, { status: 400 });

  const enquiry = await prisma.enquiry.findFirst({
    where: { AND: [{ id: Number(id) }, await enquiryScopeWhere(token)] },
    include: { order: { select: { id: true } } },
  });
  if (!enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
  if (enquiry.status === "cancelled") return NextResponse.json({ error: "This enquiry was cancelled" }, { status: 409 });
  if (enquiry.order || enquiry.status !== "open") return NextResponse.json({ error: "Enquiry has already been converted" }, { status: 409 });

  // Invoice date is required. Credit enquiries: due = invoice date + credit days.
  // Other payment modes: optional explicit due date.
  const invoiceDate = parseDateOnly(body.invoice_date);
  if (!invoiceDate) return NextResponse.json({ error: "Invalid invoice date" }, { status: 400 });
  let dueDate: Date | null = null;
  if (enquiry.payment_mode === "credit") {
    const creditDays = Number(body.credit_days ?? enquiry.credit_days);
    if (!Number.isInteger(creditDays) || creditDays < 0) {
      return NextResponse.json({ error: "Credit days must be a whole number" }, { status: 400 });
    }
    dueDate = new Date(invoiceDate.getTime() + creditDays * 24 * 60 * 60 * 1000);
  } else if (body.due_date) {
    dueDate = parseDateOnly(body.due_date);
    if (!dueDate) return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    if (dueDate < invoiceDate) return NextResponse.json({ error: "Due date cannot be before the invoice date" }, { status: 400 });
  }

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          client_id: enquiry.client_id,
          mode: enquiry.mode,
          description:
            enquiry.notes ||
            `${enquiry.incoterm ? `${enquiry.incoterm} · ` : ""}${enquiry.job_ref ? `${enquiry.job_ref} ` : ""}${enquiry.mode} freight ${enquiry.from} → ${enquiry.to}${enquiry.clearance ? " incl. clearance" : ""} (${enquiryRef(enquiry.id)})`,
          payment_mode: enquiry.payment_mode,
          amount,
          advance_amount: advance,
          from: enquiry.from,
          to: enquiry.to,
          status: "draft",
          created_by_id: enquiry.created_by_id,
          enquiry_id: enquiry.id,
          job_no: jobNo,
          invoice_date: invoiceDate,
          due_date: dueDate,
        },
      });
      await tx.enquiry.update({
        where: { id: enquiry.id },
        data: { status: "order_created", actual_cost: cost, actual_profit: profit },
      });
      await closeFollowUpTasks(tx, enquiry.id, "achieved");
      await syncOrderPayments(tx, created.id);
      return created;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Job no already exists or enquiry already converted" }, { status: 409 });
    }
    throw error;
  }

  revalidateEnquiryPages();
  revalidateTaskViews();
  revalidateTag("salesman-orders", { expire: 0 });
  revalidateTag("manager-orders", { expire: 0 });
  revalidateTag("accountant-orders", { expire: 0 });
  revalidateTag("order-stats", { expire: 0 });
  revalidatePath("/dashboard/accountant/orders");
  return NextResponse.json({ order: { id: order.id, job_no: order.job_no } }, { status: 201 });
}
