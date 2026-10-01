import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ScopedToken = {
  id?: number;
  role_id?: number;
  org_ids?: number[];
  manager_ids?: number[];
};

export function getTokenUserId(token: ScopedToken) {
  return Number(token.id);
}

export async function getManagerOrgIds(managerId: number) {
  const orgs = await prisma.managerOrg.findMany({ where: { manager_id: managerId }, select: { org_id: true } });
  return orgs.map((item) => item.org_id);
}

/** Read fresh on every request (not from the JWT) so owner re-assignments apply without a re-login. */
export async function getAccountantOrgIds(accountantId: number) {
  const orgs = await prisma.accountantOrg.findMany({ where: { accountant_id: accountantId }, select: { org_id: true } });
  return orgs.map((item) => item.org_id);
}

/** Companies a salesman works for: the companies of the managers they report to. */
export async function getSalesmanOrgIds(salesmanId: number) {
  const orgs = await prisma.managerOrg.findMany({
    where: { manager: { managerSalesmen: { some: { salesman_id: salesmanId } } } },
    select: { org_id: true },
    distinct: ["org_id"],
  });
  return orgs.map((item) => item.org_id);
}

export async function getManagerSalesmanIds(managerId: number) {
  const salesmen = await prisma.managerSalesman.findMany({ where: { manager_id: managerId }, select: { salesman_id: true } });
  return salesmen.map((item) => item.salesman_id);
}

export async function clientScopeWhere(token: ScopedToken): Promise<Prisma.ClientWhereInput> {
  const userId = getTokenUserId(token);
  if (token.role_id === 1) return {};
  if (token.role_id === 2) {
    const orgIds = token.org_ids?.length ? token.org_ids : await getManagerOrgIds(userId);
    return { org_id: { in: orgIds } };
  }
  if (token.role_id === 3) return { assigned_salesman_id: userId };
  return { id: -1 };
}

export async function orderScopeWhere(token: ScopedToken): Promise<Prisma.OrderWhereInput> {
  const userId = getTokenUserId(token);
  if (token.role_id === 1) return {};
  // Accountants see orders for clients of the companies the owner assigned them to.
  if (token.role_id === 4) return { client: { org_id: { in: await getAccountantOrgIds(userId) } } };
  if (token.role_id === 2) {
    const orgIds = token.org_ids?.length ? token.org_ids : await getManagerOrgIds(userId);
    return { client: { org_id: { in: orgIds } } };
  }
  if (token.role_id === 3) return { created_by_id: userId };
  return { id: -1 };
}

export type OrderStatsScope = { role_id: number; userId: number; orgIds: number[] };

/** Same role branching as orderScopeWhere, reshaped into plain values a raw SQL query can filter by. */
export async function orderStatsScope(token: ScopedToken): Promise<OrderStatsScope> {
  const userId = getTokenUserId(token);
  if (token.role_id === 2) {
    const orgIds = token.org_ids?.length ? token.org_ids : await getManagerOrgIds(userId);
    return { role_id: 2, userId, orgIds };
  }
  return { role_id: token.role_id ?? 0, userId, orgIds: [] };
}

export async function taskScopeWhere(token: ScopedToken): Promise<Prisma.TaskWhereInput> {
  const userId = getTokenUserId(token);
  if (token.role_id === 1) return {};
  if (token.role_id === 2) {
    const salesmanIds = await getManagerSalesmanIds(userId);
    return { OR: [{ created_by_id: userId }, { assigned_to_id: { in: salesmanIds } }] };
  }
  if (token.role_id === 3) return { OR: [{ assigned_to_id: userId }, { created_by_id: userId }] };
  return { id: -1 };
}

export async function userScopeWhere(token: ScopedToken): Promise<Prisma.UserWhereInput> {
  const userId = getTokenUserId(token);
  if (token.role_id === 1) return {};
  if (token.role_id === 2) {
    const salesmanIds = await getManagerSalesmanIds(userId);
    return { id: { in: [userId, ...salesmanIds] } };
  }
  if (token.role_id === 3) return { id: userId };
  return { id: -1 };
}

export async function canAccessSalesman(token: ScopedToken, salesmanId: number) {
  const userId = getTokenUserId(token);
  if (token.role_id === 1) return true;
  if (token.role_id === 3) return userId === salesmanId;
  if (token.role_id === 2) {
    const salesmanIds = await getManagerSalesmanIds(userId);
    return salesmanIds.includes(salesmanId);
  }
  return false;
}

export function isRole(token: ScopedToken, roles: number | number[]) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return allowed.includes(Number(token.role_id));
}
