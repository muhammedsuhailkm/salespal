import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere, getManagerSalesmanIds, getTokenUserId, type ScopedToken } from "@/lib/scoping";
import { enquiryRef, type EnquiryListItem, type EnquiryStatus } from "@/types/enquiry";

/** Salesmen: own. Managers: own + their salesmen's. Owner / accountant: all. */
export async function enquiryScopeWhere(token: ScopedToken): Promise<Prisma.EnquiryWhereInput> {
  const userId = getTokenUserId(token);
  if (token.role_id === 1 || token.role_id === 4) return {};
  if (token.role_id === 2) {
    const salesmanIds = await getManagerSalesmanIds(userId);
    return { created_by_id: { in: [userId, ...salesmanIds] } };
  }
  if (token.role_id === 3) return { created_by_id: userId };
  return { id: -1 };
}

/** Completed once the linked order is completed and fully paid (no balance left). */
function deriveStatus(
  status: string,
  order: { status: string; amount: Prisma.Decimal; advance_amount: Prisma.Decimal; payments: { amount: Prisma.Decimal }[] } | null
): EnquiryStatus {
  if (!order) return status === "order_created" ? "order_created" : "open";
  const collected = order.advance_amount.toNumber() + order.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
  const paid = collected >= order.amount.toNumber();
  return order.status === "completed" && paid ? "completed" : "order_created";
}

export async function getEnquiries(token: ScopedToken): Promise<EnquiryListItem[]> {
  const enquiries = await prisma.enquiry.findMany({
    where: await enquiryScopeWhere(token),
    include: {
      client: { select: { name: true } },
      createdBy: { select: { name: true } },
      order: { select: { id: true, job_no: true, status: true, amount: true, advance_amount: true, payments: { select: { amount: true } } } },
    },
    orderBy: [{ enquiry_date: "desc" }, { id: "desc" }],
  });

  return enquiries.map((e) => ({
    id: e.id,
    ref: enquiryRef(e.id),
    client_id: e.client_id,
    client_name: e.client.name,
    enquiry_date: e.enquiry_date.toISOString().slice(0, 10),
    mode: e.mode,
    from: e.from,
    to: e.to,
    term: e.term,
    payment_mode: e.payment_mode,
    credit_days: e.credit_days,
    clearance: e.clearance,
    provisional_cost: e.provisional_cost.toNumber(),
    provisional_profit: e.provisional_profit.toNumber(),
    actual_cost: e.actual_cost?.toNumber() ?? null,
    actual_profit: e.actual_profit?.toNumber() ?? null,
    notes: e.notes,
    status: deriveStatus(e.status, e.order),
    created_by: e.createdBy.name,
    created_at: e.created_at.toISOString(),
    order: e.order ? { id: e.order.id, job_no: e.order.job_no } : null,
  }));
}

/** Clients the user can raise an enquiry for. */
export async function getEnquiryClientOptions(token: ScopedToken) {
  return prisma.client.findMany({
    where: await clientScopeWhere(token),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export function revalidateEnquiryPages() {
  for (const role of ["salesman", "manager", "accountant", "admin"]) revalidatePath(`/dashboard/${role}/enquiries`);
}
