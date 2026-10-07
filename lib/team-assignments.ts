import { revalidatePath, revalidateTag } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Team links: a salesman works under a manager for specific companies (one manager_salesman row per company).
 * A company can only be given if the manager runs it. Every write goes through here so the rule lives in one place.
 */

type Tx = Prisma.TransactionClient;

export class TeamAssignmentError extends Error {}

async function managerOrgIds(db: Tx | typeof prisma, managerId: number) {
  const rows = await db.managerOrg.findMany({ where: { manager_id: managerId }, select: { org_id: true } });
  return rows.map((r) => r.org_id);
}

/** Companies a manager runs that the salesman works for under them. */
export async function salesmanCompaniesUnder(managerId: number, salesmanId: number) {
  const rows = await prisma.managerSalesman.findMany({ where: { manager_id: managerId, salesman_id: salesmanId }, select: { org_id: true } });
  return rows.map((r) => r.org_id);
}

/** Adds the salesman to the manager's team for one company. */
export async function assignSalesmanToCompany(managerId: number, salesmanId: number, orgId: number, db: Tx | typeof prisma = prisma) {
  if (!(await managerOrgIds(db, managerId)).includes(orgId)) throw new TeamAssignmentError("That manager doesn't run this company");
  await db.managerSalesman.upsert({
    where: { manager_id_salesman_id_org_id: { manager_id: managerId, salesman_id: salesmanId, org_id: orgId } },
    update: {},
    create: { manager_id: managerId, salesman_id: salesmanId, org_id: orgId },
  });
}

/** Removes the salesman from the manager's team for one company, or for all of them when orgId is omitted. */
export async function unassignSalesman(managerId: number, salesmanId: number, orgId?: number) {
  await prisma.managerSalesman.deleteMany({ where: { manager_id: managerId, salesman_id: salesmanId, ...(orgId ? { org_id: orgId } : {}) } });
}

/**
 * Sets exactly which of the manager's companies the salesman works for under them.
 * At least one is required — taking the salesman off the team is a separate action.
 */
export async function setSalesmanCompanies(managerId: number, salesmanId: number, orgIds: number[], db: Tx | typeof prisma = prisma) {
  const wanted = [...new Set(orgIds)];
  if (wanted.length === 0) throw new TeamAssignmentError("Pick at least one company");
  const allowed = await managerOrgIds(db, managerId);
  if (wanted.some((id) => !allowed.includes(id))) throw new TeamAssignmentError("You can only give companies the manager runs");
  await db.managerSalesman.deleteMany({ where: { manager_id: managerId, salesman_id: salesmanId, org_id: { notIn: wanted } } });
  await db.managerSalesman.createMany({
    data: wanted.map((org_id) => ({ manager_id: managerId, salesman_id: salesmanId, org_id })),
    skipDuplicates: true,
  });
}

/** Everything that shows team membership or company access. */
export function revalidateTeamViews() {
  for (const tag of ["admin-companies", "manager-dashboard", "manager-team", "manager-tasks", "manager-clients", "salesman-dashboard"]) {
    revalidateTag(tag, { expire: 0 });
  }
  revalidatePath("/dashboard/admin/companies");
  revalidatePath("/dashboard/manager/team");
}
