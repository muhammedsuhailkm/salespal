import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dateRange, intParam, literal, pageParam, paging, param, PAGE_SIZE, type Paged, type SearchParams } from "@/lib/list-params";

/** Client columns shown in client tables (no heavy relations). */
export const clientListSelect = {
  id: true,
  name: true,
  contact_person_name: true,
  contact_no: true,
  cr_no: true,
  cr_expiry_date: true,
  location_coordinates: true,
  mail_id: true,
  status: true,
  notes: true,
  created_at: true,
  org_id: true,
  assigned_salesman_id: true,
  contact_person_designation: true,
  organization: { select: { name: true } },
  assignedSalesman: { select: { name: true } },
} satisfies Prisma.ClientSelect;

export type ClientListRow = Prisma.ClientGetPayload<{ select: typeof clientListSelect }>;

/** Filters shared by the client tables: q, status, company, manager, salesman, date (+ day). */
export function clientFilterWhere(params: SearchParams): Prisma.ClientWhereInput {
  const and: Prisma.ClientWhereInput[] = [];
  const q = param(params, "q");
  if (q) {
    and.push({
      OR: [
        { name: { contains: literal(q), mode: "insensitive" } },
        { contact_person_name: { contains: literal(q), mode: "insensitive" } },
        { mail_id: { contains: literal(q), mode: "insensitive" } },
        { cr_no: { contains: literal(q), mode: "insensitive" } },
        { contact_no: { contains: literal(q) } },
      ],
    });
  }
  const status = param(params, "status");
  if (status) and.push({ status });
  const company = intParam(params, "company");
  if (company) and.push({ org_id: company });
  const manager = intParam(params, "manager");
  if (manager) and.push({ assignedSalesman: { salesmanManager: { some: { manager_id: manager } } } });
  const salesman = intParam(params, "salesman");
  if (salesman) and.push({ assigned_salesman_id: salesman });
  const range = dateRange(param(params, "date"), param(params, "day"));
  if (range) and.push({ created_at: range });
  return and.length ? { AND: and } : {};
}

export async function getClientsPage(scope: Prisma.ClientWhereInput, params: SearchParams): Promise<Paged<ClientListRow>> {
  const page = pageParam(params);
  const where: Prisma.ClientWhereInput = { AND: [scope, clientFilterWhere(params)] };
  const [rows, total] = await Promise.all([
    prisma.client.findMany({ where, select: clientListSelect, orderBy: { id: "desc" }, ...paging(page) }),
    prisma.client.count({ where }),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE };
}

/** { status: count } computed in the database — use instead of loading clients just to count them. */
export async function clientStatusCounts(where: Prisma.ClientWhereInput): Promise<Record<string, number>> {
  const rows = await prisma.client.groupBy({ by: ["status"], where, _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
}
