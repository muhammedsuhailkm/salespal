import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clientScopeWhere, getAccountantOrgIds, getManagerSalesmanIds, getTokenUserId, type ScopedToken } from "@/lib/scoping";
import { enquiryRef, type EnquiryListItem, type EnquiryStatus } from "@/types/enquiry";
import { intParam, literal, pageParam, paging, param, PAGE_SIZE, type Paged, type SearchParams } from "@/lib/list-params";

/** Salesmen: own. Managers: own + their salesmen's. Accountants: their assigned companies' clients. Owner: all. */
export async function enquiryScopeWhere(token: ScopedToken): Promise<Prisma.EnquiryWhereInput> {
  const userId = getTokenUserId(token);
  if (token.role_id === 1) return {};
  if (token.role_id === 4) return { client: { org_id: { in: await getAccountantOrgIds(userId) } } };
  if (token.role_id === 2) {
    const salesmanIds = await getManagerSalesmanIds(userId);
    return { created_by_id: { in: [userId, ...salesmanIds] } };
  }
  if (token.role_id === 3) return { created_by_id: userId };
  return { id: -1 };
}

const enquiryListInclude = {
  client: { select: { name: true } },
  createdBy: { select: { name: true } },
  order: { select: { id: true, job_no: true } },
  cancelledBy: { select: { name: true } },
  followUps: { include: { createdBy: { select: { name: true } } }, orderBy: { created_at: "desc" } },
  followUpTasks: { where: { status: { in: ["pending", "in_process"] } }, select: { id: true } },
} satisfies Prisma.EnquiryInclude;

type EnquiryWithList = Prisma.EnquiryGetPayload<{ include: typeof enquiryListInclude }>;

const STATUSES: EnquiryStatus[] = ["open", "order_created", "completed", "cancelled"];

function toListItem(e: EnquiryWithList): EnquiryListItem {
  return {
    id: e.id,
    ref: enquiryRef(e.id),
    client_id: e.client_id,
    client_name: e.client.name,
    enquiry_date: e.enquiry_date.toISOString().slice(0, 10),
    mode: e.mode,
    from: e.from,
    to: e.to,
    job_ref: e.job_ref,
    incoterm: e.incoterm,
    payment_mode: e.payment_mode,
    credit_days: e.credit_days,
    clearance: e.clearance,
    provisional_cost: e.provisional_cost.toNumber(),
    provisional_profit: e.provisional_profit.toNumber(),
    actual_cost: e.actual_cost?.toNumber() ?? null,
    actual_profit: e.actual_profit?.toNumber() ?? null,
    notes: e.notes,
    // Stored, kept in sync by syncOrderPayments(): open | order_created | completed | cancelled.
    status: (STATUSES.includes(e.status as EnquiryStatus) ? e.status : "open") as EnquiryStatus,
    created_by: e.createdBy.name,
    created_at: e.created_at.toISOString(),
    order: e.order ? { id: e.order.id, job_no: e.order.job_no } : null,
    cancel_reason: e.cancel_reason,
    cancelled_at: e.cancelled_at?.toISOString() ?? null,
    cancelled_by: e.cancelledBy?.name ?? null,
    follow_ups: e.followUps.map((f) => ({ id: f.id, comment: f.comment, by: f.createdBy.name, at: f.created_at.toISOString() })),
    follow_up_due: e.followUpTasks.length > 0,
  };
}

/** Search by ref (ENQ-00012 / 12), client name or job no. */
function enquirySearchWhere(q: string | undefined): Prisma.EnquiryWhereInput {
  if (!q) return {};
  const or: Prisma.EnquiryWhereInput[] = [
    { client: { name: { contains: literal(q), mode: "insensitive" } } },
    { order: { job_no: { contains: literal(q), mode: "insensitive" } } },
  ];
  const refId = Number(q.replace(/^enq-?/i, ""));
  if (Number.isInteger(refId) && refId > 0) or.push({ id: refId });
  return { OR: or };
}

export type EnquiryPage = Paged<EnquiryListItem> & {
  /** Per-status counts for the filter tabs (scope + search, ignoring the status filter). */
  counts: Record<EnquiryStatus | "all", number>;
  /** Enquiries in scope with an outstanding follow-up task. */
  followUpsDue: number;
  /** Enquiry opened via ?followUp=, loaded even when it is not on the current page. */
  focus: EnquiryListItem | null;
};

export async function getEnquiriesPage(token: ScopedToken, params: SearchParams): Promise<EnquiryPage> {
  const page = pageParam(params);
  const status = param(params, "status");
  const scope = await enquiryScopeWhere(token);
  const searched: Prisma.EnquiryWhereInput = { AND: [scope, enquirySearchWhere(param(params, "q"))] };
  const where: Prisma.EnquiryWhereInput = status && STATUSES.includes(status as EnquiryStatus) ? { AND: [searched, { status }] } : searched;
  const focusId = intParam(params, "followUp");

  const [rows, total, grouped, followUpsDue, focus] = await Promise.all([
    prisma.enquiry.findMany({ where, include: enquiryListInclude, orderBy: [{ enquiry_date: "desc" }, { id: "desc" }], ...paging(page) }),
    prisma.enquiry.count({ where }),
    prisma.enquiry.groupBy({ by: ["status"], where: searched, _count: { _all: true } }),
    prisma.enquiry.count({ where: { AND: [scope, { followUpTasks: { some: { status: { in: ["pending", "in_process"] } } } }] } }),
    focusId ? prisma.enquiry.findFirst({ where: { AND: [scope, { id: focusId }] }, include: enquiryListInclude }) : null,
  ]);

  const counts = { all: 0, open: 0, order_created: 0, completed: 0, cancelled: 0 } as EnquiryPage["counts"];
  for (const g of grouped) {
    if (g.status in counts) counts[g.status as EnquiryStatus] = g._count._all;
    counts.all += g._count._all;
  }

  return { rows: rows.map(toListItem), total, page, pageSize: PAGE_SIZE, counts, followUpsDue, focus: focus ? toListItem(focus) : null };
}

export function revalidateEnquiryPages() {
  for (const role of ["salesman", "manager", "accountant", "admin"]) revalidatePath(`/dashboard/${role}/enquiries`);
}
